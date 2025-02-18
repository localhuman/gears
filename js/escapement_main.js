// Import the Bootstrap bundle
//
// This includes all of Bootstrap's JS plugins.

import "./bootstrap.bundle.min.js";

import { Point} from "/js/gear.js";
import { Escapement } from "/js/escapement.js";
import { Exporter } from "/js/export.js";
import { Constants } from "./gear.js";

const dqs = (id) =>{
  return document.querySelector(id)
}


const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d")


let escapement = null 

let is_dragging = false 
let start_drag_point = null

let show_guides = true

let encoding_version = '001'


const update_state = () =>{
  escapement.update()
  // const gearsetstring = `v${encoding_version}.`+gearsets.map(set =>{
  //     return set.map(item =>`${item.pressure_angle},${item.diametral_pitch},${item.total_teeth},${item.connection_angle},${item.position.x},${item.position.y},${item.rotation_animation_increment}`).join('G')    
  // }).join('S')

  // const url = `#${encodeURI(gearsetstring)}`
  // history.replaceState(undefined, undefined, url)
//  window.location = url
}


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



dqs("#radius").addEventListener("input", (event) => {
  dqs("#radius_label").textContent = 'Radius: ' + event.target.value;
  escapement.radius = parseInt(event.target.value)
  update_state()
});


// dqs("#show_guides").addEventListener("input", (event) => {
//   show_guides = event.target.checked
// });



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
  initialize()
});

window.addEventListener('resize', (event) =>{
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
});



window.addEventListener('mousedown', (event) => {

  if(dqs('#controls').matches(':hover')){
    return
  }

  let point = new Point(event.x, event.y)
  start_drag_point = point
  if(escapement.contains(point)){
    is_dragging = true
    escapement.start_drag_point = escapement.position
  }
})

window.addEventListener('mousemove', (event) => {
  if(is_dragging){
    let dx = event.x - start_drag_point.x
    let dy = event.y - start_drag_point.y
    escapement.move_with_drag(new Point(dx, dy))
  }
})

window.addEventListener('mouseup', (event) => {
  is_dragging= false 
  escapement.is_dragging = false
  update_state()
})




const initialize = () => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width
  canvas.height = height

  let center = new Point(width/2, height/2, 5);
  escapement = new Escapement(dqs('#teeth').value, dqs('#tooth_height').value, dqs('#tooth_angle').value, dqs('#tooth_angle_undercut').value, dqs('#tooth_width').value, dqs('#radius').value, new Point(0,0), center)
}



const animate = () => {
  requestAnimationFrame(animate)

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

  if(escapement == null) {
    return
  }

  if(!is_dragging) {
    escapement.rotation_animation_value += escapement.rotation_animation_increment
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
  ctx.strokeStyle = "black"
  ctx.stroke(escapement.dd)  
//   ctx.fill(escapement.path)
//   ctx.stroke(escapement.path)

// //    if(show_guides) {
//       ctx.strokeStyle = escapement.get_guide_style()
//       ctx.stroke(escapement.guide_path)  
//       ctx.stroke(escapement.center_path)      
// //    }

  ctx.resetTransform()

}

animate()