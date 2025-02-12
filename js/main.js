// Import the Bootstrap bundle
//
// This includes all of Bootstrap's JS plugins.

import "../node_modules/bootstrap/dist/js/bootstrap.bundle.min.js";

import {Constants, Gear, Point} from "./gear.js";


const dqs = (id) =>{
  return document.querySelector(id)
}


const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d")

let gears = []
let initial_gear = null 
let selected_gear = null 
let is_dragging = false 
let start_drag_point = null


dqs("#teeth").addEventListener("input", (event) => {
  dqs("#teeth_label").textContent = 'Teeth: ' + event.target.value;
  selected_gear.total_teeth = event.target.value        
  initial_gear.rotation_animation_value = 0
  initial_gear.update_gear_ratio()

  selected_gear.update_position(selected_gear.position, true, this)

});

dqs("#pressure_angle").addEventListener("input", (event) => {
  dqs("#pressure_angle_label").textContent = 'Pressure Angle: ' + event.target.value;
  gears.forEach(g => {
    g.pressure_angle = event.target.value
    g.render()
  })

});

dqs("#pitch").addEventListener("input", (event) => {
  dqs("#pitch_label").textContent = 'Pitch: ' + event.target.value;
  const newDP = event.target.value / 30
  gears.forEach(g => {
    g.diametral_pitch = newDP
  })
  initial_gear.rotation_animation_value = 0
  initial_gear.update_gear_ratio()
  initial_gear.update_position(initial_gear.position, true, this)

});

dqs("#connection_angle").addEventListener("input", (event) => {
  dqs("#connection_angle_label").textContent = 'Connection Angle: ' + event.target.value;
  //selected_gear.connection_angle = event.target.value        
  // initial_gear.rotation_animation_value = 0
  // initial_gear.update_gear_ratio()

  selected_gear.update_connection_angle(event.target.value)

});

dqs("#rotation_speed").addEventListener("input", (event) => {
  dqs("#rotation_speed_label").textContent = 'Rotation Speed: ' + event.target.value;
  initial_gear.rotation_animation_increment = event.target.value / 2000
  initial_gear.rotation_animation_value = 0
  initial_gear.update_gear_ratio()
});


dqs("#add_gear").addEventListener("click", (event) => {  
  let new_teeth = 20
  let new_diametral_pitch = initial_gear.diametral_pitch
  let new_radius =  new_teeth / new_diametral_pitch
  let last_gear = gears.at(-1)

  let new_x = last_gear.position.x + last_gear.get_radius() + new_radius
  let new_position = new Point(new_x, last_gear.position.y)

  let new_gear = new Gear(new_teeth, last_gear.pressure_angle, new_diametral_pitch, new Point(0,0), new_position, last_gear)
  gears.push(new_gear)
  last_gear.set_child(new_gear)
  new_gear.is_rotating = initial_gear.is_rotating
  select_gear(new_gear)
  initial_gear.rotation_animation_value = 0
  initial_gear.update_gear_ratio()

});

dqs("#remove_gear").addEventListener("click", (event) => {
  if(gears.length == 1) {
    alert("Must retain 1 gear")
    return
  }
  if(selected_gear == initial_gear) {
    alert("Must keep initial gear")
    return
  }

  gears = gears.filter(item => item !== selected_gear)
  selected_gear.destroy()

  initial_gear = gears[0]
  select_gear(initial_gear)

  for(let i=0; i< gears.length; i++){
    let g = gears[i]
    if(i > 0) {
      g.parent = gears[i-1]      
    }
    if(i < gears.length){
      g.child = gears[i+1]
    }
  }
  initial_gear.rotation_animation_value = 0
  initial_gear.update_gear_ratio()
  initial_gear.update_position(initial_gear.position, true, this)

});

window.addEventListener('load', (event) =>{
  initialize()
});

window.addEventListener('mousedown', (event) => {

  if(dqs('#controls').matches(':hover')){
    console.log("over controlls")
    return
  }

  let point = new Point(event.x, event.y)
  start_drag_point = point
  let found_dragger = false
  gears.forEach(g => {
    if(g.contains(point)){
      found_dragger = true
      is_dragging = true
      select_gear(g)
    }
  })

  if(found_dragger) {
    gears.forEach(g => {
      g.start_drag_point = g.position
      g.is_dragging = true
    })  
  }
})

window.addEventListener('mousemove', (event) => {
  let p = new Point(event.x, event.y)
  if(is_dragging) {
    gears.forEach(g => {
      let dx = event.x - start_drag_point.x
      let dy = event.y - start_drag_point.y
      let nx = dx + g.start_drag_point.x 
      let ny = dy + g.start_drag_point.y
      g.update_position(new Point(nx, ny), false, this)
    })
  }
})

window.addEventListener('mouseup', (event) => {
  is_dragging= false 
  gears.forEach(g => {
    g.is_dragging = false
  })
})



const select_gear = (gear) => {
  if(selected_gear) selected_gear.deselect()   
  selected_gear = gear
  gear.select()

  dqs("#teeth").value = gear.total_teeth
  dqs("#teeth_label").textContent = 'Teeth: ' + gear.total_teeth
}

const initialize = () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width
  canvas.height = height
  let center = new Point(width/2, height/2, 5);
  initial_gear = new Gear(20,20,.1,new Point(0,0), center)
  select_gear(initial_gear)
  gears.push(initial_gear)
}


const animate = () => {
  requestAnimationFrame(animate)

  ctx.reset()

  gears.forEach(g => {
    g.rotation_animation_value += g.rotation_animation_increment
    ctx.lineWidth = 1
    ctx.strokeStyle = g.get_stroke()
    ctx.fillStyle = g.get_fill()
    ctx.translate(g.position.x, g.position.y)
    ctx.rotate(g.rotation_animation_value)
    ctx.fill(g.path)
    ctx.stroke(g.path)

    ctx.strokeStyle = g.get_guide_style()
    ctx.stroke(g.guide_path)

    ctx.strokeStyle = g.get_center_style()
    ctx.lineWidth = 2
    ctx.stroke(g.center_path)    

    ctx.resetTransform()

  })

}

animate()