// Import the Bootstrap bundle
//
// This includes all of Bootstrap's JS plugins.

import { b2DefaultBodyDef, CreateWorld, WorldStep, CreateDebugDraw, RAF, CreateBoxPolygon, b2HexColor, b2AABB, STATIC} from '/js/box2d/PhaserBox2D.js';
import { b2Vec2, b2BodyType, b2DefaultWorldDef, b2World_Draw, b2ComputeHull, b2CreateBody, b2DefaultShapeDef, b2MakeBox, b2CreatePolygonShape, b2CreateCircleShape, b2MakePolygon, b2Capsule, b2CreateCapsuleShape, b2CreateSegmentShape, b2Segment, b2DefaultChainDef, b2CreateChain, b2MakeOffsetBox, b2Body_SetAngularVelocity } from '/js/box2d/PhaserBox2D.js';
import { b2DefaultQueryFilter, b2World_OverlapAABB, b2Shape_GetBody, b2Body_GetPosition, CreateMouseJoint, CreateCircle, b2MouseJoint_SetTarget } from './box2d/PhaserBox2D.js';
import "./bootstrap.bundle.min.js";

import { Point} from "/js/gear.js";
import { Escapement } from "/js/escapement.js";
import { Exporter } from "/js/export.js";
import { Constants } from "./gear.js";
import { b2DestroyJoint } from './box2d/PhaserBox2D.js';

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


// Box 2d thngs
let mouseJoint = null   
let mouseBody = null 
let mouseDown = false    

let escapementShape = null
let escapementBody = null 
let escapementParts = null

var mousePosPixel = {
  x: 0,
  y: 0
};
var prevMousePosPixel = {
  x: 0,
  y: 0
};        
var mousePosWorld = {
  x: 0,
  y: 0
};        
var canvasOffset = {
  x: 0,
  y: 0
};        
var viewCenterPixel = {
  x:320,
  y:240
};


// parts
let escapement = null 
let is_dragging = false 
let start_drag_point = null




const dqs = (id) =>{
  return document.querySelector(id)
}


const update_state = () =>{
  escapement.update()

  if(escapementBody) {
    world.DestroyBody(escapementBody)
  }
   console.log("Hello points!!!", escapement.tooth_points.length)
   let scaledVerts = escapement.tooth_points.map(p => { 
     p.scale(1/PTM)
     return p
   })
  //console.log("scaled verts: ", scaledVerts)


  // console.log("scaled verts: ", scaledVerts)
  // escapementShape = createPolygonShape(scaledVerts)
  // console.log("escapement shape: ", escapementShape)

}

const getWorldB2Vec = (point) => {
  let pt = getWorldPointFromPixelPoint(point)
//  console.log("pt: ",point, pt, canvasOffset.y, canvas.height)
  return new b2Vec2(pt.x, pt.y * -1)
}

const getWorldPointFromPixelPoint =(pixelPoint) => {
  return {                
      x: (pixelPoint.x - canvasOffset.x)/PTM,
      y: (pixelPoint.y - (canvas.height - canvasOffset.y))/PTM
  };
}

window.addEventListener('load', (event) =>{
  initialize()
});

window.addEventListener('resize', (event) =>{
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
});

const updateMousePos = (evt) => {
  var rect = canvas.getBoundingClientRect();
  mousePosPixel = {
    x: evt.clientX - rect.left,
    y: canvas.height - (evt.clientY - rect.top)
  };
  mousePosWorld = getWorldPointFromPixelPoint(mousePosPixel);

}


const startMouseJoint = () => {
    
  if ( mouseJoint != null )
      return;
  
  let foundBody=null;

  function queryCallback(shapeId, context) {
    const bodyId = b2Shape_GetBody(shapeId);
    foundBody = bodyId
//    foundBodies.push(bodyId);
    return true; // keep going to find all shapes in the query area
  }

  // Make a small box.
  var d = 0.001;            
  console.log("Mouse pos world x, y", mousePosWorld)
  var aabb = new b2AABB(mousePosWorld.x - d,mousePosWorld.y - d, mousePosWorld.x + d, mousePosWorld.y + d);
  
  // Default filter to accept all shapes
  const filter = b2DefaultQueryFilter();

  // Perform query
  b2World_OverlapAABB(worldId, aabb, filter, queryCallback, null);

  // let found_body = null    
  // for (const bodyId of foundBodies) {
  //   found_position = b2Body_GetPosition(bodyId);
  //   console.log("Found overlap!!", pos)      
  // }

  if(foundBody) {
    let found_position = b2Body_GetPosition(foundBody);
    mouseJoint = CreateMouseJoint({ worldId,
      bodyIdA: mouseBody.bodyId,
      bodyIdB: foundBody,
      collideConnected: false,
      maxForce: 35000,
      hertz: 5.0,
      dampingRatio: 0.9,
      target:  found_position //pxmVec2(pointer.worldX, -pointer.worldY)
  });

  console.log('created', mouseJoint.jointId);    
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
  prevMousePosPixel = mousePosPixel;
  updateMousePos(event)

  if ( mouseDown && mouseJoint != null ) {

    // const xf = b2Body_GetTransform(mouseBody.bodyId);
    // //  Optional, but a much better 'feel'
    // b2Body_SetTransform(mouseBody.bodyId, pxmVec2(pointer.worldX, -pointer.worldY), xf.q);

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




const initialize = () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width
  canvas.height = height
  let center = new Point(width/2, height/2, 5);
  escapement = new Escapement(dqs('#teeth').value, dqs('#tooth_height').value, dqs('#tooth_angle').value, dqs('#tooth_angle_undercut').value, dqs('#tooth_width').value, dqs('#radius').value, new Point(0,0), center)
  initializeBox2d()
//  update_state()
}

const initializeBox2d = () =>{

  canvasOffset.x = 0;
  canvasOffset.y = 0;
  
  m_draw = CreateDebugDraw(canvas, ctx, PTM);
  worldDef = b2DefaultWorldDef();
  worldDef.gravity = new b2Vec2(0, -GRAVITY);
  // create a world and save the ID which will access it
  world = CreateWorld({ worldDef: worldDef });
  worldId = world.worldId;

  mouseBody = CreateCircle({ worldId, type: STATIC, radius: 0.3 });

  let scaledWidth = canvas.width/PTM
  let scaledHegiht = canvas.height/PTM


  // bottom
  const groundBodyDef = b2DefaultBodyDef();
  const ground = CreateBoxPolygon({ worldId:world.worldId, type:b2BodyType.b2_staticBody, bodyDef: groundBodyDef, 
    position:new b2Vec2(scaledWidth/2, -scaledHegiht), size:new b2Vec2(scaledWidth, 1), density:1.0, friction:0.5, color:b2HexColor.b2_colorLawnGreen });

  // left
  const leftBodyDef = b2DefaultBodyDef();
  const leftWall = CreateBoxPolygon({ worldId:world.worldId, type:b2BodyType.b2_staticBody, bodyDef: leftBodyDef, 
    position:new b2Vec2(0.2, -scaledHegiht), size:new b2Vec2(.1, scaledHegiht), density:1.0, friction:0.5, color:b2HexColor.b2_colorLawnGreen });

  // right
  const rightBodyDef = b2DefaultBodyDef();
  const rightWall = CreateBoxPolygon({ worldId:world.worldId, type:b2BodyType.b2_staticBody, bodyDef: leftBodyDef, 
    position:new b2Vec2(scaledWidth-.2, -scaledHegiht), size:new b2Vec2(.1, scaledHegiht), density:1.0, friction:0.5, color:b2HexColor.b2_colorLawnGreen });


  // var bodyDef = new b2BodyDef();
  // bodyDef.set_type( b2_dynamicBody );
  // var body = world.CreateBody( bodyDef );

  // var fixtureDef = new b2FixtureDef();
  // fixtureDef.set_density( 6 );
  // fixtureDef.set_restitution(0.2)
  // fixtureDef.set_friction( 0.6 );

  // for(let i=0; i<10; i++) {

  //   bodyDef = new b2BodyDef();
  //   bodyDef.set_type( b2_dynamicBody );
  //   bodyDef.set_position(new b2Vec2( Math.random(), i  ) );
  //   body = world.CreateBody( bodyDef );
  
  //   var circleShape = new b2CircleShape();
  //   circleShape.set_m_radius( 1 );
  //   body.CreateFixture( circleShape, 1.0 );
  //   fixtureDef.set_shape( circleShape );
  //   body.CreateFixture( fixtureDef );
  // }

  // var edgeShape = new b2EdgeShape();
  // edgeShape.Set( getWorldB2Vec( {x: 10, y: canvas.height - 10}), getWorldB2Vec( {x: 10, y: 0}) );
  // fixtureDef.set_shape( edgeShape );
  // ground.CreateFixture( fixtureDef );

  // var edgeShape2 = new b2EdgeShape();
  // edgeShape2.Set( getWorldB2Vec( {x: canvas.width - 10, y: canvas.height - 10}), getWorldB2Vec( {x: canvas.width - 10, y: 0}) );
  // fixtureDef.set_shape( edgeShape2 );
  // ground.CreateFixture( fixtureDef );



  const bodyDef = b2DefaultBodyDef();
  bodyDef.type = b2BodyType.b2_dynamicBody; // this will be a dynamic body
  bodyDef.position = new b2Vec2(10, -10); // set the starting position

  const bodyId = b2CreateBody(worldId, bodyDef);

  const circle = {
      center: new b2Vec2(0, 0), // position, relative to body position
      radius: 2 // radius
  };

  const shapeDef = b2DefaultShapeDef();
  const circleShape = b2CreateCircleShape(bodyId, shapeDef, circle);  
}



const animate = () => {
  requestAnimationFrame(animate)

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

  if(escapement == null) {
    return
  }



  ctx.lineWidth = 1
  ctx.strokeStyle = escapement.get_stroke()
  ctx.fillStyle = escapement.get_fill()
  ctx.translate(escapement.position.x, escapement.position.y)
  ctx.rotate(escapement.rotation_animation_value)

  let tr = escapement.total_radius
  if(escapement.svg_to_draw != null) {
    ctx.drawImage(escapement.svg_to_draw, -tr, -tr, tr*2, tr*2)
  }

  ctx.rotate(-escapement.rotation_animation_value)


  ctx.translate(escapement.pallet.pallet_center.x, escapement.pallet.pallet_center.y)
  ctx.rotate(escapement.pallet.rotation)
  ctx.translate(-escapement.pallet.pallet_center.x, -escapement.pallet.pallet_center.y)

  ctx.strokeStyle = "black"
  ctx.fillStyle = escapement.pallet.fillStyle
  ctx.stroke(escapement.pallet.path)  
  ctx.fill(escapement.pallet.path)
  ctx.fillStyle = "white"
  ctx.stroke(escapement.pallet.center_path)  
  ctx.fill(escapement.pallet.center_path)

  ctx.resetTransform()

  if(world != null) {
    WorldStep({ worldId: worldId, deltaTime: 30 });

    b2World_Draw(worldId, m_draw);

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


dqs("#rotation").addEventListener("input", (event) => {
  dqs("#rotation_label").textContent = 'Rotation: ' + event.target.value;
  escapement.rotation_animation_value = Constants.PIOVERONEEIGHTY * parseFloat(event.target.value)
  update_state()  
});

dqs("#pallet_rotation").addEventListener("input", (event) => {
  dqs("#pallet_rotation_label").textContent = 'Pallet Rotation: ' + event.target.value;
  escapement.pallet.rotation = Constants.PIOVERONEEIGHTY * parseFloat(event.target.value)
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

