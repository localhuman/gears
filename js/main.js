// Import the Bootstrap bundle
//
// This includes all of Bootstrap's JS plugins.

import "./util/bootstrap.bundle.min.js";

import {Constants, Gear, Point} from "./gear.js";
import { Exporter } from "./export.js";

// var stats = new Stats();
// stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom );

const dqs = (id) =>{
  return document.querySelector(id)
}


const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d")

let gearsets = []
//let initial_gear = null 

let selected_gearset = null 
let selected_gear = null 

let is_dragging = false 
let start_drag_point = null

let show_guides = dqs('#show_guides').checked
let show_text = dqs('#show_text').checked

let encoding_version = '001'

let view_scale = 1.0

const interaction_delay = 10

const reset = () =>{
  let initial_gear = selected_gearset[0]
  initial_gear.rotation_animation_value = 0
  initial_gear.update()
}

const update_state = () =>{

  const gearsetstring = `v${encoding_version}.`+gearsets.map(set =>{
      return set.map(item =>{
        if(item != null) {
          return `${item.pressure_angle},${item.m},${item.total_teeth},${item.connection_angle},${item.position.x},${item.position.y},${item.rotation_animation_increment},${item.total_spokes}`
        }
        return ''
    }).join('G')    
  }).join('S')

  const url = `#${encodeURI(gearsetstring)}`
  history.replaceState(undefined, undefined, url)
}

const decode_state = (state) =>{
  let statestr = decodeURI(state)
  return statestr
} 

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms || DEF_DELAY));
}


dqs("#teeth").addEventListener("input", async (event) => {
  let new_val = event.target.value 
  await sleep(interaction_delay)
  if(dqs('#teeth').value == new_val) {
    dqs("#teeth_label").textContent = 'Teeth: ' + event.target.value;
    selected_gear.total_teeth = event.target.value        
    reset()  
  }
});

dqs("#pressure_angle").addEventListener("input", async (event) => {
  let new_val = event.target.value 
  await sleep(interaction_delay)
  if(dqs('#pressure_angle').value == new_val) {
    dqs("#pressure_angle_label").textContent = 'Pressure Angle: ' + event.target.value;
    selected_gearset.forEach(g => {
      g.pressure_angle = parseFloat(event.target.value)
      g.render()
    })
    update_state()  
  }
});

dqs("#pitch").addEventListener("input", async (event) => {
  let new_val = event.target.value 
  await sleep(interaction_delay)
  if(dqs('#pitch').value == new_val) {
    dqs("#pitch_label").textContent = 'Pitch (M): ' + event.target.value;
    const newDP = event.target.value
    selected_gearset.forEach(g => {
      g.m = newDP
      g.render()
    })
    reset()  
    update_state()  
  }
});

dqs("#connection_angle").addEventListener("input", async (event) => {
  
  dqs("#connection_angle_label").textContent = 'Connection Angle: ' + event.target.value;
  selected_gear.connection_angle = event.target.value       
  reset() 
});

dqs("#rotation_speed").addEventListener("input", (event) => {
  dqs("#rotation_speed_label").textContent = 'Rotation Speed: ' + event.target.value;
  let initial_gear = selected_gearset[0]
  initial_gear.rotation_animation_increment = event.target.value / 2000
  reset()
});

dqs("#total_spokes").addEventListener("input", (event) => {
  dqs("#total_spokes_label").textContent = 'Total Spokes: ' + event.target.value;
  let initial_gear = selected_gearset[0]
  selected_gear.total_spokes = parseInt(event.target.value)
  reset()
});

// dqs("#display_scale").addEventListener("input", (event) => {
//   dqs("#display_scale_label").textContent = 'View Scale: ' + event.target.value;
//   view_scale = parseFloat(event.target.value)
//   reset()
// });


dqs("#show_guides").addEventListener("input", (event) => {
  show_guides = event.target.checked
  gearsets.forEach(gs => {
    gs.forEach(g => {
      g.show_guides = show_guides
      g.render()
    })
  })
});

dqs("#show_text").addEventListener("input", (event) => {
  show_text = event.target.checked
  gearsets.forEach(gs => {
    gs.forEach(g => {
      g.show_text = show_text
      g.render()
    })
  })
});



dqs("#add_gear").addEventListener("click", (event) => {  
  let initial_gear = selected_gearset[0]
  if(initial_gear) {
    let new_teeth = dqs("#teeth").value
    let new_m = initial_gear.m
    let last_gear = selected_gearset.at(-1)
  
    let new_position = new Point(last_gear.position.x, last_gear.position.y)
  
    let new_gear = new Gear(new_teeth, last_gear.pressure_angle, new_m, new Point(0,0), new_position, last_gear)
    new_gear.total_spokes = parseInt(dqs("#total_spokes").value)
    new_gear.show_text = show_text
    new_gear.show_guides = show_guides
    selected_gearset.push(new_gear)
    last_gear.set_child(new_gear)
    select_gear(new_gear, selected_gearset)
    reset()
  } else {
    addNewGearsetAt(new Point(canvas.width/2, canvas.height/2))
  }
  update_state()

});

dqs("#remove_gear").addEventListener("click", (event) => {
  delete_gear(false)
});


const delete_gear = (confirmed=false) =>{
  let gears = selected_gearset
  let initial_gear = gears[0]

  if(!confirmed && (gears.length == 1 || selected_gear == initial_gear)) {
      confirm_delete_initial_gear()
      return
  }

  let index = gearsets.indexOf(selected_gearset)
  selected_gearset = gears.filter(item => item !== selected_gear)
  gearsets[index] = selected_gearset
  if(selected_gear.child) {
    selected_gear.child.connection_angle = selected_gear.connection_angle
  }
  selected_gear.destroy()
  
  initial_gear = gears[0]

  if(initial_gear) {

    for(let i=0; i< selected_gearset.length; i++){
      let g = selected_gearset[i]
      if(i > 0) {
        g.parent = selected_gearset[i-1]      
      }
      if(i < gears.length){
        g.child = selected_gearset[i+1]
      }
    }
    select_gear(selected_gearset[selected_gearset.length-1], selected_gearset)

    reset()
  } else {
    gearset = gearset.filter( set => set != gears)
  }
}

const confirm_delete_initial_gear = () => {
  dqs('#confirm_modal .modal-title').textContent = "Delete Gearset?"
  dqs('#confirm_modal .modal-body').innerHTML = `<p>This will delete the parent gear and all children of this gear.</p>`
  var myModal = new bootstrap.Modal(document.getElementById('confirm_modal'))
  myModal.show()
  dqs('#confirm_modal_btn').addEventListener('click', function onClick(event){
    myModal.hide()
    delete_gear(true)
    this.removeEventListener('click', onClick)

  })
}

const reset_gears = (confirmed=false) => {
  if(!confirmed){
    dqs('#confirm_modal .modal-title').textContent = "Reset everything?"
    dqs('#confirm_modal .modal-body').innerHTML = `<p>This will delete everything and start over</p>`
    var myModal = new bootstrap.Modal(document.getElementById('confirm_modal'))
    myModal.show()
    dqs('#confirm_modal_btn').addEventListener('click', function onClick(event) {
      myModal.hide()
      reset_gears(true)
      this.removeEventListener('click', onClick)
    })  
  } else {
    window.location.href=""
  }
}

dqs("#reset_gears").addEventListener("click", (event) => {
  reset_gears(false)
});

dqs("#share_svg").addEventListener("click", (event) => {
  navigator.clipboard.writeText(window.location)
  var myModal = new bootstrap.Modal(document.getElementById('share_modal'))
  myModal.show()
});


dqs("#export_svg").addEventListener("click", (event)=> {
  var myModal = new bootstrap.Modal(document.getElementById('export_modal'))
  myModal.show()
})

dqs('#export_selected_gear').addEventListener('click', (event) => {
  const filename = dqs('#svg_file_name').value
  Exporter.export_gear_svg(selected_gear, filename)
})  


dqs('#export_all_gears').addEventListener('click', (event) => {
  const filename = dqs('#svg_file_name').value
  const separate = dqs('#show_separate_gearsets').checked
  Exporter.export_all_gears_svg(gearsets, filename, separate)
})  


dqs("#about_button").addEventListener("click", (event) => {
  var myModal = new bootstrap.Modal(document.getElementById('about_modal'))
  myModal.show()
});


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

window.addEventListener('resize', (event) =>{
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
});



window.addEventListener('click', (event) => {

  if(dqs('#controls').matches(':hover')){
    return
  }
  if(event.shiftKey) {

    let point = new Point(event.x * view_scale, event.y * view_scale)  
    addNewGearsetAt(point, true)
  }
})

const addNewGearsetAt = (point, add_gearset=false) => {
  let new_gear = new Gear(parseInt(dqs('#teeth').value), parseFloat(dqs('#pressure_angle').value), parseFloat(dqs('#pitch').value), new Point(0,0), point)
  new_gear.total_spokes = parseInt(dqs("#total_spokes").value)
  new_gear.show_text = show_text
  new_gear.show_guides = show_guides

  let new_gearset = [new_gear]

  if(add_gearset) {
    gearsets.push(new_gearset)
  } else {
    gearsets = [new_gearset]
  }

  select_gear(new_gear, new_gearset)
  reset()


}

window.addEventListener('mousedown', (event) => {

  if(dqs('#controls').matches(':hover')){
    return
  }

  let point = new Point(event.x, event.y)
  //console.log("point: ", event.x, event.y, point.x, point.y)
  start_drag_point = point
  let found_dragger = false
  gearsets.forEach(set => {
    set.forEach(g => {
      if(g.contains(point)){
        found_dragger = true
        is_dragging = true
        select_gear(g, set)
      }
    })  
  })

  if(found_dragger) {
    gearsets.forEach(set =>{
      set.forEach(g => {
        g.start_drag_point = g.position
        g.is_dragging = true
      })    
    })
  }
})

window.addEventListener('mousemove', (event) => {
  if(is_dragging){
    let dx = (event.x) - start_drag_point.x
    let dy = (event.y) - start_drag_point.y
    let initial_gear = selected_gearset[0]
    initial_gear.move_with_drag(new Point(dx, dy))
  }
})

window.addEventListener('mouseup', (event) => {
  is_dragging= false 
  gearsets.forEach(set => {
    set.forEach(g => {
      g.is_dragging = false
    })  
  })
  update_state()

})



const select_gear = (gear, gearset) => {
  if(selected_gear === gear) {
    return
  } else if( gear == null) {
    return
  }

  if(selected_gear) selected_gear.deselect()   
  selected_gear = gear
  selected_gearset = gearset
  gear.select()
  dqs("#teeth").value = gear.total_teeth
  dqs("#teeth_label").textContent = 'Teeth: ' + gear.total_teeth

  dqs("#connection_angle").value = gear.connection_angle
  dqs("#connection_angle_label").textContent = 'Connection Angle: ' + gear.connection_angle

  dqs("#pitch").value = gear.m
  dqs("#pitch_label").textContent = 'Pitch (M): ' + gear.m

  let initial_gear  = selected_gearset[0]
  dqs("#rotation_speed").value = initial_gear.rotation_animation_increment * 2000
  dqs("#rotation_speed_label").textContent = 'Rotation Speed: ' + parseInt(initial_gear.rotation_animation_increment * 2000)


  dqs("#total_spokes").value = gear.total_spokes
  dqs("#total_spokes_label").textContent = 'Total Spokes: ' + gear.total_spokes


  if(selected_gearset.indexOf(gear) == 0) {
    dqs("#connection_angle").disabled = true
  } else {
    dqs("#connection_angle").disabled = false
  }
}

const initialize = (params) => {
  let width = window.innerWidth;
  let height = window.innerHeight;
  canvas.width = width
  canvas.height = height
  gearsets.push([])
  selected_gearset = gearsets[0]

  if(params) {
    initialize_from_gearlist(params)
  } else {
    let center = new Point(width/2, height/2, 5);
    let start_gear = new Gear( parseInt(dqs('#teeth').value), parseFloat(dqs('#pressure_angle').value), parseFloat(dqs('#pitch').value),new Point(0,0), center)
    selected_gearset.push(start_gear)  
    select_gear(start_gear, selected_gearset)

  }
}


const initialize_from_gearlist = (params) => {
  gearsets = []
  let version = params.substring(0,4)
  // default it to string without version
  let data = params
  //future proof in case data format changes
  switch(version){
    case 'v001':      
      data = params.substring(5)
      break 
  }

  let temp_gearsets = []  
  let gearset_list = data.split('S')
  gearset_list.forEach(glist => {
    let list = glist.split('G')
    temp_gearsets.push(list)
  })

  temp_gearsets.forEach(glist =>{
    let newgears = []
    let parent = null
    for(var i = 0; i< glist.length; i++) {
      let g = glist[i].split(',')
      //return set.map(item =>`${item.pressure_angle},${item.m},${item.total_teeth},${item.connection_angle},${item.position.x},${item.position.y}`).join('G')    
      let newGear = new Gear(parseInt(g[2]),parseFloat(g[0]),parseFloat(g[1]), new Point(0,0), new Point(parseFloat(g[4]), parseFloat(g[5])),parent)
      newGear.connection_angle = g[3]
      newGear.rotation_animation_increment = parseFloat(g[6])
      newGear.total_spokes = parseInt(g[7])
      newgears.push( newGear )
      if(parent) {
        parent.child = newGear
      }
      parent = newGear
    }
    gearsets.push(newgears)
    let firstGear = newgears[0]
    firstGear.update()
  })

  selected_gearset = gearsets[0]
  let initial_gear = selected_gearset[0]
  select_gear(initial_gear, selected_gearset)
  reset()
}

const animate = () => {
  requestAnimationFrame(animate)

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

  gearsets.forEach( set =>{

    set.forEach(g => {

      if(!is_dragging) {
        g.rotation_animation_value += g.rotation_animation_increment
  
      }
      ctx.lineWidth = 1
      ctx.strokeStyle = g.get_stroke()
      ctx.fillStyle = g.get_fill()

      //ctx.scale(view_scale, view_scale)

      ctx.translate(g.position.x, g.position.y)
      ctx.rotate(g.rotation_animation_value)

      if(g.svg_to_draw != null) {
        let tr = g.outside_radius
        ctx.drawImage(g.svg_to_draw, -tr, -tr, tr*2, tr*2)
      } 

      ctx.resetTransform()
    })
  })
}

animate()