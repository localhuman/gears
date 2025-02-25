// Import the Bootstrap bundle
//
// This includes all of Bootstrap's JS plugins.

import { b2DefaultBodyDef, CreateWorld, WorldStep, CreateDebugDraw, RAF, CreateBoxPolygon, b2HexColor, b2AABB, STATIC} from '/js/box2d/PhaserBox2D-Debug.js';
import { b2Vec2, b2BodyType, b2DefaultWorldDef, b2World_Draw, b2ComputeHull, b2CreateBody, b2DefaultShapeDef, b2MakeBox, b2CreatePolygonShape, b2CreateCircleShape, b2MakePolygon, b2Capsule, b2CreateCapsuleShape, b2CreateSegmentShape, b2Segment, b2DefaultChainDef, b2CreateChain, b2MakeOffsetBox, b2Body_SetAngularVelocity } from '/js/box2d/PhaserBox2D-Debug.js';
import { b2DefaultQueryFilter, b2World_OverlapAABB, b2Shape_GetBody, b2Body_GetPosition, CreateMouseJoint, CreateCircle, b2MouseJoint_SetTarget, b2Body_SetTransform, b2Body_GetTransform, b2Rot_GetAngle, b2Body_GetMassData, b2ComputePolygonMass } from './box2d/PhaserBox2D-Debug.js';
import "./bootstrap.bundle.min.js";

import { Point} from "/js/gear.js";
import { Escapement } from "/js/escapement.js";
import { Exporter } from "/js/export.js";
import { Constants } from "./gear.js";
import { b2DestroyJoint,b2DestroyBody,b2DefaultRevoluteJointDef,b2CreateRevoluteJoint,b2Body_SetUserData, b2World_GetContactEvents } from './box2d/PhaserBox2D-Debug.js';


// colors:
// #002E2C
// #035E7B
// #EFF1C5
// #A2A77F
// #E3E7AF

// canvas!
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d")


// Physics settings
const PTM = 24
const GRAVITY = 10
const timeTest = false;

let m_draw 
let worldDef
let world 
let worldId
let ground,leftSde,rightSide

// Box 2d thngs
let mouseJoint = null   
let mouseBody = null 
let mouseDown = false    

// parts
let escapement = null 
let escapementBody = null 

let palletBody = null

let palletDensity = 0.8
let leftRightFactor = 0.445
let palletFriction = 0.3

let escapementDensity = 0.5
let escapementFriction = 0.01
let motorSpeed = 0.66
let motorTorque = 6500

let lastContactTime = Date.now()
let lastContactPositive = true
let contactTimes = []

var mousePosWorld = {
  x: 0,
  y: 0
};        

var mousePosPixel = {
  x: 0,
  y: 0
}




const dqs = (id) =>{
  return document.querySelector(id)
}


const update_state = () =>{
  escapement.update()

  createEscapementPhysics()
}


const getWorldPointFromPixelPoint =(mx, my) => {
  return {                
      x: (mx - canvas.width/2)/PTM,
      y: (my - canvas.height/2)/-PTM
  };
}



const initialize = () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width
  canvas.height = height
  let center = new Point(width/2, height/2, 5);
  escapement = new Escapement(dqs('#teeth').value, dqs('#tooth_height').value, dqs('#tooth_angle').value, dqs('#tooth_angle_undercut').value, dqs('#tooth_width').value, dqs('#radius').value, new Point(0,0), center)
  initializeBox2d()
  createEscapementPhysics()

}

const initializeBox2d = () =>{

  
  m_draw = CreateDebugDraw(canvas, ctx, PTM);
  m_draw.DrawSolidPolygon = () => {}
  m_draw.DrawSolidCircle = () => {}
  m_draw.flags = 0x0001 && 0x0002
  worldDef = b2DefaultWorldDef();
  worldDef.gravity = new b2Vec2(0, -GRAVITY);
  // create a world and save the ID which will access it
  world = CreateWorld({ worldDef: worldDef });
  worldId = world.worldId;

  mouseBody = CreateCircle({ worldId, type: STATIC, radius: 0.3, position: new b2Vec2(-100, -100) });

}


const createEscapementPhysics = () => {

  console.log("Recreating escapement!")

  if(escapementBody != null) {
    b2DestroyBody(escapementBody)
    b2DestroyBody(palletBody)
  }


  let scaledWidth = canvas.width/PTM
  let scaledHegiht = canvas.height/PTM

  const groundBodyDef = b2DefaultBodyDef()
  const groundId = b2CreateBody(worldId, groundBodyDef);

  const bodyDef = b2DefaultBodyDef();
  bodyDef.type = b2BodyType.b2_dynamicBody; // this will be a dynamic body
//  bodyDef.position =  new b2Vec2(0,0) 
  const shapeDef = b2DefaultShapeDef();
  shapeDef.density = escapementDensity
  shapeDef.friction = escapementFriction
  escapementBody = b2CreateBody(worldId, bodyDef);
  b2Body_SetUserData(escapementBody, "wheel")
  const circle = {
      center: new b2Vec2(0, 0), // position, relative to body position
      radius: escapement.radius/ PTM // radius
  };

  b2CreateCircleShape(escapementBody, shapeDef, circle);  

  console.log("circle anchor body, escapement body", groundId, escapementBody, world)
  const jointDef = b2DefaultRevoluteJointDef();
  jointDef.bodyIdA = escapementBody;
  jointDef.bodyIdB = groundId;
  //jointDef.collideConnected = false;
  jointDef.localAnchorA = new b2Vec2(0, 0); 
  jointDef.localAnchorB = new b2Vec2(0,0)  // center of the circle
  jointDef.enableMotor = true;
  jointDef.maxMotorTorque = motorTorque;
  jointDef.motorSpeed = motorSpeed

  const joint = b2CreateRevoluteJoint(worldId, jointDef);

  for(let j=0; j< escapement.tooth_points.length; j++) {
    let points = escapement.tooth_points[j]
    let scaledVerts = points.map(p => { 
      p.scaleNegY(1/PTM)
      return new b2Vec2(p.x, p.y)
    })
    const hull = b2ComputeHull(scaledVerts, scaledVerts.length);
    const polygon = b2MakePolygon(hull, 0);
    const polygonShape = b2CreatePolygonShape(escapementBody, shapeDef, polygon);
  }


  const PgroundBodyDef = b2DefaultBodyDef()
  const PgroundId = b2CreateBody(worldId, PgroundBodyDef);
  PgroundBodyDef.position= new b2Vec2(-100, -100)

// //   // pallet
  let palletBodyDef = b2DefaultBodyDef();
  palletBodyDef.type = b2BodyType.b2_dynamicBody; // this will be a dynamic body
  palletBodyDef.position =  new b2Vec2(10, 20) ; // set the starting position
  palletBody = b2CreateBody(worldId, palletBodyDef)
  b2Body_SetUserData(palletBody, "pallet")


  //right side mass = 23.243
  ///left side mass = 25.243
  // multiply left side by 0.9207701145

  let palletShapeDefLeft = b2DefaultShapeDef();
  palletShapeDefLeft.density = palletDensity * leftRightFactor;
  palletShapeDefLeft.friction = palletFriction


  let palletShapeDef = b2DefaultShapeDef();
  palletShapeDef.density = palletDensity;
  palletShapeDef.friction = palletFriction


  // pendulum!
  let pendulumOffset = escapement.total_radius * escapement.pallet.pendulum_offset
  let pendulumShapeDef = b2DefaultShapeDef()
  pendulumShapeDef.density = 1
  const pendulum = {
    center: new b2Vec2(0, pendulumOffset / -PTM), // position, relative to body position
    radius: escapement.pallet.pendulum_radius / PTM // radius
  };  
  b2CreateCircleShape(palletBody, pendulumShapeDef, pendulum);  


  let p1verts = escapement.pallet.part1.map(p => { 
    p.translate( new Point(0, -escapement.pallet.pallet_center.y))
    p.scaleNegY(1/PTM)
    return new b2Vec2(p.x, p.y)
  })

  let palletHull = b2ComputeHull(p1verts, p1verts.length);
  let palletPolygon = b2MakePolygon(palletHull, 0);
  b2CreatePolygonShape(palletBody, palletShapeDef, palletPolygon);
  console.log("Mass: 1 ", b2ComputePolygonMass(palletPolygon, 1).mass)

  let p2verts = escapement.pallet.part2.map(p => { 
    p.translate( new Point(0, -escapement.pallet.pallet_center.y))
    p.scaleNegY(1/PTM)
    return new b2Vec2(p.x, p.y)
  })
  palletHull = b2ComputeHull(p2verts, p2verts.length);
  palletPolygon = b2MakePolygon(palletHull, 0);
  b2CreatePolygonShape(palletBody, palletShapeDefLeft, palletPolygon);
  console.log("Mass: 2 ", b2ComputePolygonMass(palletPolygon, 1).mass)

  let p3verts = escapement.pallet.part3.map(p => { 
    p.translate( new Point(0, -escapement.pallet.pallet_center.y))
    p.scaleNegY(1/PTM)
    return new b2Vec2(p.x, p.y)
  })
  palletHull = b2ComputeHull(p3verts, p3verts.length);
  palletPolygon = b2MakePolygon(palletHull, 0);
  b2CreatePolygonShape(palletBody, palletShapeDef, palletPolygon);
  console.log("Mass: 3 ", b2ComputePolygonMass(palletPolygon, 1).mass)

  let p4verts = escapement.pallet.part4.map(p => { 
    p.translate( new Point(0, -escapement.pallet.pallet_center.y))
    p.scaleNegY(1/PTM)
    return new b2Vec2(p.x, p.y)
  })
  palletHull = b2ComputeHull(p4verts, p4verts.length);
  palletPolygon = b2MakePolygon(palletHull, 0);
  b2CreatePolygonShape(palletBody, palletShapeDefLeft, palletPolygon);
  console.log("Mass: 4 ", b2ComputePolygonMass(palletPolygon, 1).mass)



  const PjointDef = b2DefaultRevoluteJointDef();
  PjointDef.bodyIdA = palletBody;
  PjointDef.bodyIdB = PgroundId;
  //jointDef.collideConnected = false;
  PjointDef.localAnchorA = new b2Vec2(0,0)
//  PjointDef.localAnchorA =  new b2Vec2(escapement.pallet.pallet_center.x/PTM, escapement.pallet.pallet_center.y/PTM); 
  PjointDef.localAnchorB = new b2Vec2(0, escapement.pallet.pallet_center.y / -PTM) // center of the circle
  // PjointDef.enableMotor = true;
  // PjointDef.maxMotorTorque = 200;
  // PjointDef.motorSpeed = 0.01 //

   const Pjoint = b2CreateRevoluteJoint(worldId, PjointDef);

}




const animate = () => {
  requestAnimationFrame(animate)

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

  if(escapement == null) {
    return
  }

  let transformEscapement = b2Body_GetTransform(escapementBody);
  let rotationEscapement = b2Rot_GetAngle(transformEscapement.q)
  let transformPallet = b2Body_GetTransform(palletBody)
  let rotationPallet = b2Rot_GetAngle(transformPallet.q)


  // draw the pallet
  ctx.translate(escapement.position.x, escapement.position.y)
  ctx.translate(escapement.pallet.pallet_center.x, escapement.pallet.pallet_center.y)
  ctx.rotate(-rotationPallet)
  ctx.translate(-escapement.pallet.pallet_center.x, -escapement.pallet.pallet_center.y)

  ctx.strokeStyle = escapement.pallet.strokeStyle
  ctx.fillStyle = escapement.pallet.fillStyle
  ctx.stroke(escapement.pallet.path)  
  ctx.fill(escapement.pallet.path)
  ctx.fillStyle = "rgb(27, 27, 27)"
  ctx.stroke(escapement.pallet.center_path)  
  ctx.fill(escapement.pallet.center_path)

  ctx.fillStyle = escapement.pallet.fillStyle
  ctx.stroke(escapement.pallet.pendulum_spine)
  ctx.fill(escapement.pallet.pendulum_spine)

  ctx.stroke(escapement.pallet.pendulum_ball)
  ctx.fill(escapement.pallet.pendulum_ball)

  ctx.resetTransform()



  ctx.lineWidth = 1
  ctx.strokeStyle = escapement.get_stroke()
  ctx.fillStyle = escapement.get_fill()
  ctx.translate(escapement.position.x, escapement.position.y)
  ctx.rotate(-rotationEscapement)

  let tr = escapement.total_radius
  if(escapement.svg_to_draw != null) {
    ctx.drawImage(escapement.svg_to_draw, -tr, -tr, tr*2, tr*2)
  }

  ctx.rotate(rotationEscapement)





  ctx.resetTransform()

  if(world != null) {
    WorldStep({ worldId: worldId, deltaTime: 30 });

    //b2World_Draw(worldId, m_draw);
    const contactEvents = b2World_GetContactEvents(worldId);
    if(contactEvents.beginCount) {
      const begin = contactEvents.beginEvents[0]
      const collisionX = begin.manifold.points[0].pointX
      let periodSwitched = false 
      if(collisionX > 0 && !lastContactPositive) {
        periodSwitched = true
        lastContactPositive = true
      } else if(collisionX < 0 && lastContactPositive) {
        periodSwitched = true 
        lastContactPositive = false
      }
      if(periodSwitched) {
        let newContactTime = Date.now()
        let period = newContactTime - lastContactTime
        lastContactTime = newContactTime

        // if you leave the window and come back the contact time will be a lot
        if(period < 5000)
          contactTimes.push(period)

        if(contactTimes.length > 50) {
          contactTimes.shift()
        }
        let average = contactTimes.reduce((acc=0, i) => {
          return i + acc
        }) / contactTimes.length

        dqs('#period_label').textContent = `Elapsed: ${period} ms`
        dqs('#average_label').textContent = `Average: ${parseInt(average)} ms`
  
      }
    }

    ctx.restore();  
  }


}

animate()







































/***
 * 
 * 
 * UI Stuff
 */



dqs("#teeth").addEventListener("input", (event) => {
  dqs("#teeth_label").textContent = 'Teeth: ' + event.target.value;
  escapement.total_teeth = parseInt(event.target.value)
  update_state()
});

dqs("#tooth_angle").addEventListener("input", (event) => {
  dqs("#tooth_angle_label").textContent = 'Tooth Angle: ' + event.target.value;
  escapement.tooth_angle = parseFloat(event.target.value)
  update_state()
});

dqs("#tooth_angle_undercut").addEventListener("input", (event) => {
  dqs("#tooth_angle_undercut_label").textContent = 'Tooth Undercut Angle: ' + event.target.value;
  escapement.tooth_undercut_angle = parseFloat(event.target.value)
  update_state()
});

dqs("#tooth_width").addEventListener("input", (event) => {
  dqs("#tooth_width_label").textContent = 'Tooth Width: ' + event.target.value;
  escapement.tooth_width = parseFloat(event.target.value)
  update_state()
});


dqs("#tooth_height").addEventListener("input", (event) => {
  dqs("#tooth_height_label").textContent = 'Tooth Height: ' + event.target.value;
  escapement.tooth_height = parseFloat(event.target.value)
  update_state()  
});

dqs("#spokes").addEventListener("input", (event) => {
  dqs("#spokes_label").textContent = 'Spokes: ' + event.target.value;
  escapement.total_spokes = parseInt(event.target.value)
  update_state()  
});




dqs("#pallet_fork_width").addEventListener("input", (event) => {
  dqs("#pallet_fork_width_label").textContent = 'Fork Width: ' + event.target.value;
  escapement.pallet.fork_degrees = parseFloat(event.target.value)
  update_state()  
});

dqs("#radius").addEventListener("input", (event) => {
  dqs("#radius_label").textContent = 'Radius: ' + event.target.value;
  escapement.radius = parseInt(event.target.value)
  update_state()
});


//f
// dqs("#finger_angle").addEventListener("input", (event) => {
//   dqs("#finger_angle_label").textContent = 'Finger Angle: ' + event.target.value;
//   let value = 45 - parseFloat(event.target.value)
//   escapement.pallet.finger_offset = value
//   update_state()
// });

dqs("#pendulum_offset").addEventListener("input", (event) => {
  dqs("#pendulum_offset_label").textContent = 'Pendulum Offset: ' + event.target.value;
  escapement.pallet.pendulum_offset = parseFloat(event.target.value)
  update_state()
});

dqs("#pendulum_radius").addEventListener("input", (event) => {
  dqs("#pendulum_radius_label").textContent = 'Pendulum Radius: ' + event.target.value;
  escapement.pallet.pendulum_radius = parseFloat(event.target.value)
  update_state()
});

dqs("#pallet_density").addEventListener("input", (event) => {
  dqs("#pallet_density_label").textContent = 'Pallet Density: ' + event.target.value;
  palletDensity = parseFloat(event.target.value)
  update_state()
});

dqs("#pallet_lr").addEventListener("input", (event) => {
  dqs("#pallet_lr_label").textContent = 'Pallet L/R: ' + event.target.value;
  leftRightFactor = parseFloat(event.target.value)
  update_state()
});

dqs("#pallet_friction").addEventListener("input", (event) => {
  dqs("#pallet_friction_label").textContent = 'Pallet friction: ' + event.target.value;
  palletFriction = parseFloat(event.target.value)
  update_state()
});

dqs("#motor_speed").addEventListener("input", (event) => {
  dqs("#motor_speed_label").textContent = 'motor speed: ' + event.target.value;
  motorSpeed = parseFloat(event.target.value)
  update_state()
});

dqs("#motor_torque").addEventListener("input", (event) => {
  dqs("#motor_torque_label").textContent = 'motor torque: ' + event.target.value;
  motorTorque = parseInt(event.target.value)
  update_state()
});


dqs("#export_svg").addEventListener("click", (event)=> {
  var myModal = new bootstrap.Modal(document.getElementById('export_modal'))
  myModal.show()

  // dqs('#export_selected_gear').addEventListener('click', (event) => {
  //   const filename = dqs('#svg_file_name').value
  //   Exporter.export_gear_svg(selected_gear, filename)
  //   myModal.hide()
  // })  


  // dqs('#export_all_gears').addEventListener('click', (event) => {
  //   const filename = dqs('#svg_file_name').value
  //   const separate = dqs('#show_separate_gearsets').checked
  //   Exporter.export_all_gears_svg(gearsets, filename, separa)
  //   myModal.hide()
  // })  
})


// Mouse things 


window.addEventListener('load', (event) =>{
  initialize()
});

window.addEventListener('resize', (event) =>{
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  let scaledWidth = canvas.width/PTM
  let scaledHegiht = canvas.height/PTM

  let xf = b2Body_GetTransform(ground.bodyId);
  b2Body_SetTransform(ground.bodyId,  new b2Vec2(-scaledWidth/2, -scaledHegiht/2 +1),xf.q)
  b2Body_SetTransform(leftSde.bodyId,  new b2Vec2(-scaledWidth/2, -scaledHegiht/2),xf.q)
  b2Body_SetTransform(rightSide.bodyId,  new b2Vec2(scaledWidth/2 - 0.2, -scaledHegiht/2),xf.q)

});

const updateMousePos = (evt) => {
  var rect = canvas.getBoundingClientRect();
  mousePosPixel = {
    x: evt.clientX - rect.left,
    y: canvas.height - (evt.clientY - rect.top)
  };
  mousePosWorld = getWorldPointFromPixelPoint(evt.x, evt.y);

}


const startMouseJoint = () => {
    
  if ( mouseJoint != null )
      return;
  
  let foundBody=null;
  function queryCallback(shapeId, _context) {
    const bodyId = b2Shape_GetBody(shapeId);
    foundBody = bodyId
    return true; // keep going to find all shapes in the query area
  }

  // Make a small box.
  var d = 0.001;            
  var aabb = new b2AABB(mousePosWorld.x - d,mousePosWorld.y - d, mousePosWorld.x + d, mousePosWorld.y + d);
  
  // Default filter to accept all shapes
  const filter = b2DefaultQueryFilter();

  // Perform query
  b2World_OverlapAABB(worldId, aabb, filter, queryCallback, null);
  if(foundBody) {
    let found_position = b2Body_GetPosition(foundBody);
    mouseJoint = CreateMouseJoint({ worldId,
      bodyIdA: mouseBody.bodyId,
      bodyIdB: foundBody,
      collideConnected: false,
      maxForce: 35000,
      hertz: 5.0,
      dampingRatio: 0.9,
      target:  found_position 
    });
  }
}


window.addEventListener('mousedown', (event) => {

  if(dqs('#controls').matches(':hover')){
    return
  }


  updateMousePos( event);
  if ( !mouseDown ) {
    startMouseJoint();
    mouseDown = true;
  }
})

window.addEventListener('mousemove', (event) => {
  updateMousePos(event)

  if ( mouseDown && mouseJoint != null ) {
    //const xf = b2Body_GetTransform(mouseBody.bodyId);
    // //  Optional, but a much better 'feel'
    //b2Body_SetTransform(mouseBody.bodyId, pxmVec2(mousePosWorld.x, mousePosWorld.y), xf.q);
    b2MouseJoint_SetTarget(mouseJoint.jointId, new b2Vec2(mousePosWorld.x, mousePosWorld.y));
  }
})

window.addEventListener('mouseup', (event) => {
  mouseDown = false;
  updateMousePos(event);
  if ( mouseJoint != null ) {
    b2DestroyJoint(mouseJoint.jointId);
    mouseJoint = null;
}
})


