// Import the Bootstrap bundle
//
// This includes all of Bootstrap's JS plugins.

import "/js/box2d/Box2D_v2.3.1_min.js"
import "/js/box2d/embox2d-helpers.js"
import "/js/box2d/embox2d-html5canvas-debugDraw.js"

import "./bootstrap.bundle.min.js";

import { Point} from "/js/gear.js";
import { Escapement } from "/js/escapement.js";
import { Exporter } from "/js/export.js";
import { Constants } from "./gear.js";




// Box 2d thngs
const PTM = 1;
let world = null;
let mouseJointGroundBody;
let myDebugDraw;        
let myQueryCallback;
let mouseJoint = null;    
let mouseDown = false    
let run = true;
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

// canvas!
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d")

// parts
let escapement = null 
let is_dragging = false 
let start_drag_point = null




const dqs = (id) =>{
  return document.querySelector(id)
}


const update_state = () =>{
  escapement.update()
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
  
  // Make a small box.
  var aabb = new Box2D.b2AABB();
  var d = 0.001;            
  aabb.set_lowerBound(new b2Vec2(mousePosWorld.x - d, mousePosWorld.y - d));
  aabb.set_upperBound(new b2Vec2(mousePosWorld.x + d, mousePosWorld.y + d));
  
  // Query the world for overlapping shapes.            
  myQueryCallback.m_fixture = null;
  myQueryCallback.m_point = new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y);
  world.QueryAABB(myQueryCallback, aabb);
  
  if (myQueryCallback.m_fixture)
  {
      var body = myQueryCallback.m_fixture.GetBody();
      var md = new Box2D.b2MouseJointDef();
      md.set_bodyA(mouseJointGroundBody);
      md.set_bodyB(body);
      md.set_target( new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y) );
      md.set_maxForce( 3000 * body.GetMass() );
      md.set_collideConnected(true);
      
      mouseJoint = Box2D.castObject( world.CreateJoint(md), Box2D.b2MouseJoint );
      body.SetAwake(true);
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
    mouseJoint.SetTarget( new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y) );
  }

})

window.addEventListener('mouseup', (event) => {
  mouseDown = false;
  updateMousePos(event);
  if ( mouseJoint != null ) {
      world.DestroyJoint(mouseJoint);
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
}

const initializeBox2d = () =>{

  canvasOffset.x = canvas.width/2;
  canvasOffset.y = canvas.height/2;
  
  myDebugDraw = getCanvasDebugDraw();            
  myDebugDraw.SetFlags(0x0001);
  
  myQueryCallback = new Box2D.JSQueryCallback();

  myQueryCallback.ReportFixture = function(fixturePtr) {
      var fixture = Box2D.wrapPointer( fixturePtr, b2Fixture );
      if ( fixture.GetBody().GetType() != Box2D.b2_dynamicBody ) //mouse cannot drag static bodies around
          return true;
      if ( ! fixture.TestPoint( this.m_point ) )
          return true;
      this.m_fixture = fixture;
      return false;
  };  


  if ( world != null ) 
    Box2D.destroy(world);
    
  world = new Box2D.b2World( new Box2D.b2Vec2(0.0, -10.0) );
  world.SetDebugDraw(myDebugDraw);

  mouseJointGroundBody = world.CreateBody( new Box2D.b2BodyDef() );

  var ground = world.CreateBody( new b2BodyDef() );
  var shape = new b2EdgeShape();
  shape.Set(new b2Vec2(-canvas.width/2, -canvas.height/2 + 3), new b2Vec2(canvas.width/2, -canvas.height/2 + 3));
  ground.CreateFixture(shape, 0.0);

  var bodyDef = new b2BodyDef();
  bodyDef.set_type( b2_dynamicBody );
  var body = world.CreateBody( bodyDef );

  var circleShape = new b2CircleShape();
  circleShape.set_m_radius( 20 );
  body.CreateFixture( circleShape, 1.0 );

  var fixtureDef = new b2FixtureDef();
  fixtureDef.set_density( 0.1 );
  fixtureDef.set_restitution(0.2)
  fixtureDef.set_friction( 0.1 );
  fixtureDef.set_shape( circleShape );
  body.CreateFixture( fixtureDef );

  var edgeShape = new b2EdgeShape();
  edgeShape.Set( new b2Vec2( -canvas.width/2 +3, -canvas.height/2 ), new b2Vec2( -canvas.width/2 + 3, canvas.height/2 ) );
  fixtureDef.set_shape( edgeShape );
  ground.CreateFixture( fixtureDef );

  var edgeShape2 = new b2EdgeShape();
  edgeShape2.Set( new b2Vec2( canvas.width/2 -3, -canvas.height/2 ), new b2Vec2( canvas.width/2 -3, canvas.height/2 ) );
  fixtureDef.set_shape( edgeShape2 );
  ground.CreateFixture( fixtureDef );

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
    world.Step(1/30, 3, 2);
    ctx.save()
    ctx.translate(canvasOffset.x, canvasOffset.y);
    ctx.scale(1,-1);                
    ctx.scale(PTM,PTM);
    ctx.lineWidth =2;
    
    drawAxes(ctx);
    
    ctx.fillStyle = 'rgb(255,255,0)';
    world.DrawDebugData();

    if ( mouseJoint != null ) {
      //mouse joint is not drawn with regular joints in debug draw
      var p1 = mouseJoint.GetAnchorB();
      var p2 = mouseJoint.GetTarget();
      context.strokeStyle = 'rgb(116, 7, 7)';
      context.beginPath();
      context.moveTo(p1.get_x(),p1.get_y());
      context.lineTo(p2.get_x(),p2.get_y());
      context.stroke();
  }    
    context.restore();  
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

