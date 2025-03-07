// Import the Bootstrap bundle
//
// This includes all of Bootstrap's JS plugins.

import { b2DefaultBodyDef, CreateWorld, WorldStep, CreateDebugDraw} from './box2d/PhaserBox2D-Debug.js';
import { b2Vec2, b2BodyType, b2DefaultWorldDef, b2World_Draw, b2ComputeHull, b2CreateBody, b2DefaultShapeDef, b2CreatePolygonShape, b2CreateCircleShape, b2MakePolygon } from './box2d/PhaserBox2D-Debug.js';
import { b2Body_GetTransform, b2Rot_GetAngle } from './box2d/PhaserBox2D-Debug.js';
import { b2DestroyBody,b2DefaultRevoluteJointDef,b2CreateRevoluteJoint,b2Body_SetUserData, b2World_GetContactEvents } from './box2d/PhaserBox2D-Debug.js';

import "./util/bootstrap.bundle.min.js";

import { Point} from "./gear.js";
import { Escapement } from "./escapement.js";
import { Exporter } from "./export.js";


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

// parts
let escapement = null 
let escapementBody = null 

let palletBody = null

const default_settings = {
  version: 'v1.0',
  total_teeth: 30,
  tooth_height: 50,
  radius: 200,
  spokes: 5,
  spoke_padding: 0.065,
  tooth_angle: 17,
  tooth_undercut_angle: 90,
  tooth_width: 0.02,
  fork_degrees: 2.25,

  finger_offset: 1.5,
  palletDensity : 0.8,
  counterweight_radius : 31.50,
  palletFriction : 0.3,

  pendulum_offset: 3.31,
  pendulum_radius: 59,

  escapementDensity : 0.5,
  escapementFriction : 0.01,
  motorSpeed : 0.66,
  motorTorque : 6500,
}

let settings = default_settings

let lastContactTime = Date.now()
let lastContactPositive = true
let contactTimes = []

let savedDegins = []

const dqs = (id) =>{
  return document.querySelector(id)
}


const update_state = () =>{

  let json = JSON.stringify(settings)
  let urlified = `#${encodeURI(json)}`
  history.replaceState(undefined, undefined, urlified)

  escapement.update(settings)

  createEscapementPhysics()
}

const loadDesigns = () => {
  let loadedDesigns = localStorage.getItem("escapements")
  if(loadedDesigns) {
    try {
      savedDegins = JSON.parse(loadedDesigns)
    } catch (e) {
      localStorage.setItem("escapements", JSON.stringify(savedDegins))      
    }
  } else {
    localStorage.setItem("escapements", JSON.stringify(savedDegins))      
  }
  dqs('#load_design').disabled = savedDegins.length < 1

  const select = dqs('#design_selector')
  select.options.length = 0
  savedDegins.forEach((item, index)=> {
    let option = new Option(item.name, index)
    select.add(option)
  })

} 

const loadFromUrl = () => {
  const location = window.location.hash.substring(1)
  try {
    let statestr = decodeURI(location)
    let json = JSON.parse(statestr)    
    updateUI(json)
    return json
  } catch(e) {
    //console.log("Could not decode state", e)
    history.replaceState(undefined, undefined, "#")
    return default_settings
  }
}


const initialize = () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width
  canvas.height = height
  let center = new Point(width/2, height/2, 5);


  settings = loadFromUrl()

  escapement = new Escapement(settings, new Point(0, 0), center)
  initializeBox2d()
  createEscapementPhysics()
  loadDesigns()
}

const initializeBox2d = () =>{

  //m_draw = CreateDebugDraw(canvas, ctx, PTM);
  // m_draw.DrawSolidPolygon = () => {}
  // m_draw.DrawSolidCircle = () => {}

  worldDef = b2DefaultWorldDef();
  worldDef.gravity = new b2Vec2(0, -GRAVITY);

  // create a world and save the ID which will access it
  world = CreateWorld({ worldDef: worldDef });
  worldId = world.worldId;

}


const createEscapementPhysics = () => {

  if(escapementBody != null) {
    b2DestroyBody(escapementBody)
    b2DestroyBody(palletBody)
  }

  const groundBodyDef = b2DefaultBodyDef()
  const groundId = b2CreateBody(worldId, groundBodyDef);

  const bodyDef = b2DefaultBodyDef();
  bodyDef.type = b2BodyType.b2_dynamicBody; // this will be a dynamic body
  const shapeDef = b2DefaultShapeDef();
  shapeDef.density = settings.escapementDensity
  shapeDef.friction = settings.escapementFriction
  escapementBody = b2CreateBody(worldId, bodyDef);
  b2Body_SetUserData(escapementBody, "wheel")
  const circle = {
      center: new b2Vec2(0, 0), // position, relative to body position
      radius: settings.radius/ PTM // radius
  };

  b2CreateCircleShape(escapementBody, shapeDef, circle);  

  const jointDef = b2DefaultRevoluteJointDef();
  jointDef.bodyIdA = escapementBody;
  jointDef.bodyIdB = groundId;
  //jointDef.collideConnected = false;
  jointDef.localAnchorA = new b2Vec2(0, 0); 
  jointDef.localAnchorB = new b2Vec2(0,0)  // center of the circle
  jointDef.enableMotor = true;
  jointDef.maxMotorTorque = settings.motorTorque;
  jointDef.motorSpeed = settings.motorSpeed

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
  palletBodyDef.position =  new b2Vec2(0, 20) ; // set the starting position
  palletBody = b2CreateBody(worldId, palletBodyDef)
  b2Body_SetUserData(palletBody, "pallet")



  let palletShapeDef = b2DefaultShapeDef();
  palletShapeDef.density = settings.palletDensity;
  palletShapeDef.friction = settings.palletFriction


  // pendulum!
  let pendulumOffset = escapement.total_radius * settings.pendulum_offset
  let pendulumShapeDef = b2DefaultShapeDef()
  pendulumShapeDef.density = 1

  const pendulum = {
    center: new b2Vec2(0, pendulumOffset / -PTM), // position, relative to body position
    radius: settings.pendulum_radius / PTM // radius
  };  
  b2CreateCircleShape(palletBody, pendulumShapeDef, pendulum);  



  let cwRad = settings.counterweight_radius / PTM
  let cwcenter = new b2Vec2(escapement.pallet.counterweight_center.x/PTM, escapement.pallet.counterweight_center.y / -PTM)

  if(settings.counterweight_radius < 0) {
    cwRad = settings.counterweight_radius / -PTM
    cwcenter = new b2Vec2(escapement.pallet.counterweight_center_left.x/PTM, escapement.pallet.counterweight_center_left.y / -PTM)
  }
  // counterweight provides abilit to change
  // the period of left/rights swing
  const counterweight = {
    center: cwcenter, // position, relative to body position
    radius: cwRad // radius
  };  
  b2CreateCircleShape(palletBody, pendulumShapeDef, counterweight);  



  // pallet is complex shape that needs to be drawn in 
  // 4 different polygons
  let p1verts = escapement.pallet.part1.map(p => { 
    p.translate( new Point(0, -escapement.pallet.pallet_center.y))
    p.scaleNegY(1/PTM)
    return new b2Vec2(p.x, p.y)
  })

  let palletHull = b2ComputeHull(p1verts, p1verts.length);
  let palletPolygon = b2MakePolygon(palletHull, 0);
  b2CreatePolygonShape(palletBody, palletShapeDef, palletPolygon);
  //console.log("Mass: 1 ", b2ComputePolygonMass(palletPolygon, 1).mass)

  let p2verts = escapement.pallet.part2.map(p => { 
    p.translate( new Point(0, -escapement.pallet.pallet_center.y))
    p.scaleNegY(1/PTM)
    return new b2Vec2(p.x, p.y)
  })
  palletHull = b2ComputeHull(p2verts, p2verts.length);
  palletPolygon = b2MakePolygon(palletHull, 0);
  b2CreatePolygonShape(palletBody, palletShapeDef, palletPolygon);

  let p3verts = escapement.pallet.part3.map(p => { 
    p.translate( new Point(0, -escapement.pallet.pallet_center.y))
    p.scaleNegY(1/PTM)
    return new b2Vec2(p.x, p.y)
  })
  palletHull = b2ComputeHull(p3verts, p3verts.length);
  palletPolygon = b2MakePolygon(palletHull, 0);
  b2CreatePolygonShape(palletBody, palletShapeDef, palletPolygon);

  let p4verts = escapement.pallet.part4.map(p => { 
    p.translate( new Point(0, -escapement.pallet.pallet_center.y))
    p.scaleNegY(1/PTM)
    return new b2Vec2(p.x, p.y)
  })
  palletHull = b2ComputeHull(p4verts, p4verts.length);
  palletPolygon = b2MakePolygon(palletHull, 0);
  b2CreatePolygonShape(palletBody, palletShapeDef, palletPolygon);

  // joint of pallet to wall
  const PjointDef = b2DefaultRevoluteJointDef();
  PjointDef.bodyIdA = palletBody;
  PjointDef.bodyIdB = PgroundId;
  PjointDef.localAnchorA = new b2Vec2(0,0)
  PjointDef.localAnchorB = new b2Vec2(0, escapement.pallet.pallet_center.y / -PTM) // center of the circle

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

  ctx.fillStyle = escapement.pallet.fillStyle
  ctx.stroke(escapement.pallet.pendulum_spine)
  ctx.fill(escapement.pallet.pendulum_spine)

  ctx.strokeStyle = escapement.pallet.strokeStyle
  ctx.fillStyle = escapement.pallet.fillStyle
  ctx.stroke(escapement.pallet.path)  
  ctx.fill(escapement.pallet.path)

  ctx.fillStyle = escapement.pallet.strokeStyle
  ctx.stroke(escapement.pallet.crosshair)  

  ctx.strokeStyle = escapement.pallet.strokeStyle
  ctx.fillStyle = escapement.pallet.fillStyle

  ctx.stroke(escapement.pallet.pendulum_ball)
  ctx.fill(escapement.pallet.pendulum_ball)

  ctx.stroke(escapement.pallet.counterweight)
  ctx.fill(escapement.pallet.counterweight)

  ctx.stroke(escapement.pallet.counterweight_left)
  ctx.fill(escapement.pallet.counterweight_left)

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

//    b2World_Draw(worldId, m_draw);
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

// on startup this is called with sesttings from url
const updateUI = (settings) =>{
  dqs("#teeth").value = settings.total_teeth
  dqs("#teeth_label").textContent = 'Teeth: ' + settings.total_teeth

  dqs("#tooth_angle").value = settings.tooth_angle
  dqs("#tooth_angle_label").textContent = 'Tooth Angle: ' +settings.tooth_angle

  dqs("#tooth_height").value = settings.tooth_height
  dqs("#tooth_height_label").textContent = 'Tooth Height: ' + settings.tooth_height
 
  dqs("#tooth_angle_undercut").value = settings.tooth_undercut_angle
  dqs("#tooth_angle_undercut_label").textContent = 'Tooth Undercut Angle: ' + settings.tooth_undercut_angle

  dqs("#tooth_width").value = settings.tooth_width
  dqs("#tooth_width_label").textContent = 'Tooth Width: ' + settings.tooth_width

  dqs("#spokes").value = settings.spokes
  dqs("#spokes_label").textContent = 'Spokes: ' + settings.spokes

  dqs("#spoke_padding").value = settings.spoke_padding
  dqs("#spoke_padding_label").textContent = 'Spoke Padding: ' + settings.spoke_padding

  dqs("#pallet_fork_width").value = settings.fork_degrees
  dqs("#pallet_fork_width_label").textContent = 'Fork Width: ' + settings.fork_degrees
  
  dqs("#radius").value = settings.radius
  dqs("#radius_label").textContent = 'Radius: ' + settings.radius
    

  dqs("#pendulum_offset").value = settings.pendulum_offset
  dqs("#pendulum_offset_label").textContent = 'Pendulum Offset: ' + settings.pendulum_offset

  dqs("#pendulum_radius").value = settings.pendulum_radius
  dqs("#pendulum_radius_label").textContent = 'Pendulum Radius: ' + settings.pendulum_radius

 
  dqs("#pallet_density").value = settings.palletDensity
  dqs("#pallet_density_label").textContent = 'Pallet Density: ' + settings.palletDensity

  dqs("#pallet_lr").value = settings.counterweight_radius / 10
  dqs("#pallet_lr_label").textContent = 'Pallet Balance: ' + settings.counterweight_radius / 10

  dqs("#pallet_friction").value = settings.palletFriction
  dqs("#pallet_friction_label").textContent = 'Pallet friction: ' + settings.palletFriction
  
  dqs("#motor_speed").value = settings.motorSpeed
  dqs("#motor_speed_label").textContent = 'Motor speed: ' + settings.motorSpeed
  
  dqs("#motor_torque").value = settings.motorTorque
  dqs("#motor_torque_label").textContent = 'motor torque: ' + settings.motorTorque
  
}

dqs("#teeth").addEventListener("input", (event) => {
  dqs("#teeth_label").textContent = 'Teeth: ' + event.target.value;
  settings.total_teeth = parseInt(event.target.value)
  update_state()
});

dqs("#tooth_angle").addEventListener("input", (event) => {
  dqs("#tooth_angle_label").textContent = 'Tooth Angle: ' + event.target.value;
  settings.tooth_angle = parseFloat(event.target.value)
  update_state()
});

dqs("#tooth_angle_undercut").addEventListener("input", (event) => {
  dqs("#tooth_angle_undercut_label").textContent = 'Tooth Undercut Angle: ' + event.target.value;
  settings.tooth_undercut_angle = parseFloat(event.target.value)
  update_state()
});

dqs("#tooth_width").addEventListener("input", (event) => {
  dqs("#tooth_width_label").textContent = 'Tooth Width: ' + event.target.value;
  settings.tooth_width = parseFloat(event.target.value)
  update_state()
});


dqs("#tooth_height").addEventListener("input", (event) => {
  dqs("#tooth_height_label").textContent = 'Tooth Height: ' + event.target.value;
  settings.tooth_height = parseFloat(event.target.value)
  update_state()  
});

dqs("#spokes").addEventListener("input", (event) => {
  dqs("#spokes_label").textContent = 'Spokes: ' + event.target.value;
  settings.spokes = parseInt(event.target.value)
  update_state()  
});

dqs("#spoke_padding").addEventListener("input", (event) => {
  dqs("#spoke_padding_label").textContent = 'Spoke Padding: ' + event.target.value;
  settings.spoke_padding = parseFloat(event.target.value)
  update_state()  
});



dqs("#pallet_fork_width").addEventListener("input", (event) => {
  dqs("#pallet_fork_width_label").textContent = 'Fork Width: ' + event.target.value;
  settings.fork_degrees = parseFloat(event.target.value)
  update_state()  
});

dqs("#radius").addEventListener("input", (event) => {
  dqs("#radius_label").textContent = 'Radius: ' + event.target.value;
  settings.radius = parseInt(event.target.value)
  update_state()
});




dqs("#pendulum_offset").addEventListener("input", (event) => {
  dqs("#pendulum_offset_label").textContent = 'Pendulum Offset: ' + event.target.value;
  settings.pendulum_offset = parseFloat(event.target.value)
  update_state()
});

dqs("#pendulum_radius").addEventListener("input", (event) => {
  dqs("#pendulum_radius_label").textContent = 'Pendulum Radius: ' + event.target.value;
  settings.pendulum_radius = parseFloat(event.target.value)
  update_state()
});

dqs("#pallet_density").addEventListener("input", (event) => {
  dqs("#pallet_density_label").textContent = 'Pallet Density: ' + event.target.value;
  settings.palletDensity = parseFloat(event.target.value)
  update_state()
});

dqs("#pallet_lr").addEventListener("input", (event) => {
  dqs("#pallet_lr_label").textContent = 'Pallet Balance: ' + event.target.value;
  settings.counterweight_radius = parseFloat(event.target.value) * 10
  update_state()
});

dqs("#pallet_friction").addEventListener("input", (event) => {
  dqs("#pallet_friction_label").textContent = 'Pallet friction: ' + event.target.value;
  settings.palletFriction = parseFloat(event.target.value)
  update_state()
});

dqs("#motor_speed").addEventListener("input", (event) => {
  dqs("#motor_speed_label").textContent = 'motor speed: ' + event.target.value;
  settings.motorSpeed = parseFloat(event.target.value)
  update_state()
});

dqs("#motor_torque").addEventListener("input", (event) => {
  dqs("#motor_torque_label").textContent = 'motor torque: ' + event.target.value;
  settings.motorTorque = parseInt(event.target.value)
  update_state()
});


dqs("#export_svg").addEventListener("click", (event)=> {
  var myModal = new bootstrap.Modal(document.getElementById('export_modal'))
  myModal.show()

  dqs('#export_all_gears').addEventListener('click', function onClick(event) {
    const filename = dqs('#svg_file_name').value
    Exporter.export_escapement(escapement, filename)
    myModal.hide()
    this.removeEventListener('click', onClick)
  })  
})

dqs("#share_design").addEventListener("click", (event) => {
  navigator.clipboard.writeText(window.location)
  var myModal = new bootstrap.Modal(document.getElementById('share_modal'))
  myModal.show()
});

dqs("#about_button").addEventListener("click", (event) => {
  var myModal = new bootstrap.Modal(document.getElementById('about_modal'))
  myModal.show()
});


dqs("#save_design").addEventListener("click", (event) => {

  var myModal = new bootstrap.Modal(document.getElementById('save_modal'))
  myModal.show()

  dqs('#do_save_escapement').addEventListener('click', function onClick(event) {
    const filename = dqs('#escapement_name').value
    let to_save = {
      name: filename,
      value: settings
    }
    savedDegins.push(to_save)
    localStorage.setItem('escapements', JSON.stringify(savedDegins))

    myModal.hide()
    this.removeEventListener('click', onClick)
    loadDesigns()
  })  

});



dqs("#load_design").addEventListener("click", (event) => {

  var myModal = new bootstrap.Modal(document.getElementById('load_modal'))
  myModal.show()

  dqs('#do_load_escapement').addEventListener('click', function onClick(event) {
    let selected = dqs('#design_selector').value
    const selectedDesign = savedDegins[selected].value
    settings = selectedDesign
    update_state()   
    updateUI(settings)
    myModal.hide()
    this.removeEventListener('click', onClick)
  })  
});

dqs('#do_delete_escapement').addEventListener('click', function onClick(event) {
  let selected = dqs('#design_selector').value
  savedDegins.splice(selected, 1);
  localStorage.setItem('escapements', JSON.stringify(savedDegins))
  loadDesigns()
})  




window.addEventListener('load', (event) =>{
  initialize()
});

window.addEventListener('resize', (event) =>{
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  let center = new Point(canvas.width/2, canvas.height/2, 5);
  escapement.position = center
  update_state()
});

// for bootstrap modals closing to prevent
// warnings in the browser console
document.addEventListener('hidden.bs.modal', function (event) {
  if (document.activeElement) {
  document.activeElement.blur();
  }
});