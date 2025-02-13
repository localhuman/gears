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



const reset = () =>{
  initial_gear.rotation_animation_value = 0
  initial_gear.update()
  update_state()
}

const update_state = () =>{
  const gearmapstring = gears.map(item =>`${item.total_teeth},${item.connection_angle},${item.position.x},${item.position.y}`).join('G')
  let state = {
    p: initial_gear.diametral_pitch,
    pa: initial_gear.pressure_angle,
    gs: gearmapstring
  }
  const stateString = JSON.stringify(state)
  const url = `#${encodeURI(stateString)}`
  console.log("Update state: ", stateString, url)
  window.location = url
//  const url = url
}

const decode_state = (state) =>{
  let statestr = decodeURI(state)
  return JSON.parse(statestr)
} 

dqs("#teeth").addEventListener("input", (event) => {
  dqs("#teeth_label").textContent = 'Teeth: ' + event.target.value;
  selected_gear.total_teeth = event.target.value        
  reset()
});

dqs("#pressure_angle").addEventListener("input", (event) => {
  dqs("#pressure_angle_label").textContent = 'Pressure Angle: ' + event.target.value;
  gears.forEach(g => {
    g.pressure_angle = event.target.value
    g.render()
  })
  update_state()
});

dqs("#pitch").addEventListener("input", (event) => {
  dqs("#pitch_label").textContent = 'Pitch: ' + event.target.value;
  const newDP = event.target.value / 30
  gears.forEach(g => {
    g.diametral_pitch = newDP
  })
  reset()  
});

dqs("#connection_angle").addEventListener("input", (event) => {
  dqs("#connection_angle_label").textContent = 'Connection Angle: ' + event.target.value;
  selected_gear.connection_angle = event.target.value       
  reset() 
});

dqs("#rotation_speed").addEventListener("input", (event) => {
  dqs("#rotation_speed_label").textContent = 'Rotation Speed: ' + event.target.value;
  initial_gear.rotation_animation_increment = event.target.value / 2000
  reset()
});


dqs("#add_gear").addEventListener("click", (event) => {  

  if(initial_gear) {
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
    reset()
  } else {
    let center = new Point(window.innerWidth/2, window.innerHeight/2, 5);
    initial_gear = new Gear(20,20,.2,new Point(0,0), center)
    select_gear(initial_gear)
    gears.push(initial_gear)
  
  }
  update_state()

});

dqs("#remove_gear").addEventListener("click", (event) => {
  delete_gear(false)
});


const delete_gear = (confirmed=false) =>{
  if(!confirmed && (gears.length == 1 || selected_gear == initial_gear)) {
      confirm_delete_initial_gear()
      return
    }

    gears = gears.filter(item => item !== selected_gear)
    if(selected_gear.child) {
      selected_gear.child.connection_angle = selected_gear.connection_angle
    }
    selected_gear.destroy()
    
    initial_gear = gears[0]

    if(initial_gear) {

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
    
      reset()
    }
}

const confirm_delete_initial_gear = () => {
  dqs('.modal-title').textContent = "Delete Gearset?"
  dqs('.modal-body').innerHTML = `<p>This will delete the parent gear and all children of this gear.</p>`
  var myModal = new bootstrap.Modal(document.getElementById('confirm_modal'))
  myModal.show()
  dqs('#confirm_modal_btn').addEventListener('click', (event) => {
    myModal.hide()
    delete_gear(true)
  })
}

window.addEventListener('load', (event) =>{
  const location = window.location.hash.substring(1)
  let windowstate = null
  try {
    windowstate = decode_state(location)
  } catch(e) {
    console.log("Could not decode state", e)
  }
  initialize(windowstate)
});

window.addEventListener('mousedown', (event) => {

  if(dqs('#controls').matches(':hover')){
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
  if(is_dragging){
    let dx = event.x - start_drag_point.x
    let dy = event.y - start_drag_point.y
    initial_gear.move_with_drag(new Point(dx, dy))
  }
})

window.addEventListener('mouseup', (event) => {
  is_dragging= false 
  gears.forEach(g => {
    g.is_dragging = false
  })
  update_state()

})



const select_gear = (gear) => {
  if(selected_gear) selected_gear.deselect()   
  selected_gear = gear
  gear.select()

  dqs("#teeth").value = gear.total_teeth
  dqs("#teeth_label").textContent = 'Teeth: ' + gear.total_teeth

  dqs("#connection_angle").value = gear.connection_angle
  dqs("#connection_angle_label").textContent = 'Connection Angle: ' + gear.connection_angle

  if(selected_gear == initial_gear) {
    dqs("#connection_angle").disabled = true
//    dqs("#remove_gear").disabled = true
  } else {
    dqs("#connection_angle").disabled = false
//    dqs("#remove_gear").disabled = false
  }
}

const initialize = (params) => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width
  canvas.height = height
  console.log("initializing with state!", params)
  if(params) {
    initialize_from_gearlist(params)
  } else {
    let center = new Point(width/2, height/2, 5);
    initial_gear = new Gear(20,20,.2,new Point(0,0), center)
    select_gear(initial_gear)
    gears.push(initial_gear)  
    console.log("Initial gear position: ", initial_gear.position)

  }
}


const initialize_from_gearlist = (params) => {
  let gearlist = params.gs.split('G').map(item => {
    let g = item.split(',')
    return {
      teeth: g[0],
      angle: g[1],
      x: g[2],
      y: g[3]
    }
  })
  console.log("Gearlist: ", gearlist)
  initial_gear = new Gear(gearlist[0].teeth, params.pa, params.p, new Point(0,0), new Point(gearlist[0].x, gearlist[0].y, 5))
  //select_gear(initial_gear)
  gears.push(initial_gear)  
  console.log("Initial gear position: ", initial_gear.position)

  let last_parent = initial_gear
  for(let i=1; i< gearlist.length; i++) {
    let info = gearlist[i]
    let new_gear = new Gear(info.teeth, params.pa, params.p, new Point(0, 0), new Point(info.x, info.y, 2), last_parent)
    new_gear.connection_angle = info.angle
    last_parent.child = new_gear
    gears.push(new_gear)
    last_parent = new_gear
  }
  select_gear(last_parent)
  reset()
}

const animate = () => {
  requestAnimationFrame(animate)

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

  gears.forEach(g => {

    if(!is_dragging) {
      g.rotation_animation_value += g.rotation_animation_increment

    }
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

    // ctx.font = "16px sans serif";
    // ctx.textBaseline = "hanging";
    // ctx.strokeStyle = "black"
    // ctx.strokeText(g.to_string(), -40, -60);
    // ctx.strokeText(g.rotation_animation_value * Constants.ONEEIGHTYOVERPI, -40, -40)
    ctx.resetTransform()

  })

}

animate()