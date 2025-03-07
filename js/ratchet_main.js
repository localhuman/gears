// Import the Bootstrap bundle
//
// This includes all of Bootstrap's JS plugins.

import "./util/bootstrap.bundle.min.js";

import { Point} from "./gear.js";
import { Ratchet } from "./ratchet.js";
import { Exporter } from "./export.js";

const dqs = (id) =>{
  return document.querySelector(id)
}


const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d")

let ratchets = []

let selected_ratchet = null 

let is_dragging = false 
let start_drag_point = null

let show_guides = true

let encoding_version = '001'


const update_state = () =>{
  selected_ratchet.update()
  // const gearsetstring = `v${encoding_version}.`+gearsets.map(set =>{
  //     return set.map(item =>`${item.pressure_angle},${item.diametral_pitch},${item.total_teeth},${item.connection_angle},${item.position.x},${item.position.y},${item.rotation_animation_increment}`).join('G')    
  // }).join('S')

  // const url = `#${encodeURI(gearsetstring)}`
  // history.replaceState(undefined, undefined, url)
//  window.location = url
}


dqs("#teeth").addEventListener("input", (event) => {
  dqs("#teeth_label").textContent = 'Teeth: ' + event.target.value;
  selected_ratchet.total_teeth = parseInt(event.target.value)
  update_state()
});

dqs("#tooth_angle").addEventListener("input", (event) => {
  dqs("#tooth_angle_label").textContent = 'Tooth Angle: ' + event.target.value;
  selected_ratchet.tooth_angle = parseFloat(event.target.value)
  update_state()
});

dqs("#tooth_height").addEventListener("input", (event) => {
  dqs("#tooth_height_label").textContent = 'Tooth Height: ' + event.target.value;
  selected_ratchet.tooth_height = parseFloat(event.target.value)
  update_state()  
});

dqs("#radius").addEventListener("input", (event) => {
  dqs("#radius_label").textContent = 'Radius: ' + event.target.value;
  selected_ratchet.radius = parseInt(event.target.value)
  update_state()
});


// dqs("#show_guides").addEventListener("input", (event) => {
//   show_guides = event.target.checked
// });


// dqs("#add_ratchetr").addEventListener("click", (event) => {  
//   let initial_gear = selected_gearset[0]
//   if(initial_gear) {
//     let new_teeth = dqs("#teeth").value
//     let new_diametral_pitch = initial_gear.diametral_pitch
//     let new_radius =  new_teeth / new_diametral_pitch
//     let last_gear = selected_gearset.at(-1)
  
//     let new_x = last_gear.position.x + last_gear.get_radius() + new_radius
//     let new_position = new Point(new_x, last_gear.position.y)
  
//     let new_gear = new Gear(new_teeth, last_gear.pressure_angle, new_diametral_pitch, new Point(0,0), new_position, last_gear)
//     selected_gearset.push(new_gear)
//     last_gear.set_child(new_gear)
//     select_gear(new_gear, selected_gearset)
//     reset()
//   } else {
//     // let center = new Point(window.innerWidth/2, window.innerHeight/2, 5);
//     // initial_gear = new Gear(20,20,.2,new Point(0,0), center)
//     // select_gear(initial_gear, null)
//     // gears.push(initial_gear)
  
//   }
//   update_state()

// });

dqs("#remove_ratchet").addEventListener("click", (event) => {
  delete_ratchet(false)
});


const delete_ratchet = (confirmed=false) =>{

}


const reset_ratchets = (confirmed=false) => {
  if(!confirmed){
    dqs('#confirm_modal .modal-title').textContent = "Reset everything?"
    dqs('#confirm_modal .modal-body').innerHTML = `<p>This will delete everything and start over</p>`
    var myModal = new bootstrap.Modal(document.getElementById('confirm_modal'))
    myModal.show()
    dqs('#confirm_modal_btn').addEventListener('click', (event) => {
      myModal.hide()
      reset_ratchets(true)
    })  
  } else {
    window.location.href=""
  }
}

dqs("#reset_ratchets").addEventListener("click", (event) => {
  reset_ratchets(false)
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


window.addEventListener('load', (event) =>{
  const location = window.location.hash.substring(1)
  initialize(location)
});

window.addEventListener('resize', (event) =>{
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
});


window.addEventListener('click', (event) => {

  if(dqs('#controls').matches(':hover')){
    return
  }
  if(event.shiftKey) {
    let point = new Point(event.x, event.y)  
    let new_ratchet = new Ratchet(dqs('#teeth').value, dqs('#tooth_height').value, dqs('#tooth_angle').value, dqs('#radius').value, new Point(0,0), point)
    ratchets.push(new_ratchet)
    select_ratchet(new_ratchet)

  }
})

window.addEventListener('mousedown', (event) => {

  if(dqs('#controls').matches(':hover')){
    return
  }

  let point = new Point(event.x, event.y)
  start_drag_point = point
  let found_dragger = false
  ratchets.forEach(g => {
    if(g.contains(point)){
      found_dragger = true
      is_dragging = true
      select_ratchet(g)
    }
  })

  if(found_dragger) {
    ratchets.forEach(g => {
      g.start_drag_point = g.position
      g.is_dragging = true
    })    
  }
})

window.addEventListener('mousemove', (event) => {
  if(is_dragging){
    let dx = event.x - start_drag_point.x
    let dy = event.y - start_drag_point.y
    selected_ratchet.move_with_drag(new Point(dx, dy))
  }
})

window.addEventListener('mouseup', (event) => {
  is_dragging= false 
  ratchets.forEach(g => {
    g.is_dragging = false
  })  
  update_state()
})



const select_ratchet = (ratchet) => {
  if(selected_ratchet) selected_ratchet.deselect()   
  selected_ratchet = ratchet
  ratchet.select()

  dqs("#teeth").value = ratchet.total_teeth
  dqs("#teeth_label").textContent = 'Teeth: ' + ratchet.total_teeth

  // dqs("#connection_angle").value = gear.connection_angle
  // dqs("#connection_angle_label").textContent = 'Connection Angle: ' + gear.connection_angle

}

const initialize = (params) => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width
  canvas.height = height
  ratchets = []

  if(params) {
    initialize_from_list(params)
  } else {

    let center = new Point(width/2, height/2, 5);
    let start_ratchet = new Ratchet(dqs('#teeth').value, dqs('#tooth_height').value, dqs('#tooth_angle').value, dqs('#radius').value, new Point(0,0), center)
    ratchets.push(start_ratchet)  
    select_ratchet(start_ratchet)
  }
}


const initialize_from_list = (params) => {

}

const animate = () => {
  requestAnimationFrame(animate)

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)


  ratchets.forEach(g => {

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

//    if(show_guides) {
      ctx.strokeStyle = g.get_guide_style()
      ctx.stroke(g.guide_path)  
      ctx.strokeStyle = g.get_center_style()
      ctx.lineWidth = 2
      ctx.stroke(g.center_path)      
//    }

    ctx.resetTransform()
  })

}

animate()