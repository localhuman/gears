import { Point, Constants, generate_gear_name } from "/js/gear.js"


export class Ratchet{

  total_teeth  = 20
  tooth_height = 30
  tooth_angle = 90
  radius = 300

  center = null
  position = null 

  vertices = null

  is_dragging = false
  start_drag_point = null

  is_rotating = false
  rotation_animation_increment = 0.000
  rotation_animation_value = 0 


  name= null

  path = null
  center_path = null
  guide_path = null
  text_path = null

  svg_path = null 


  constructor(total_teeth= 20, tooth_height=30, tooth_angle=90, radius=300, center, position){

    this.name = generate_gear_name('ratchet')

    this.total_teeth = parseInt(total_teeth)
    this.tooth_height = parseFloat(tooth_height)
    this.tooth_angle = parseFloat(tooth_angle)
    this.radius = parseInt(radius)

    this.vertices = []
    this.center = center
    this.position = position

    this.path = new Path2D()

    //console.log("Created ratchet: ", this.total_teeth, this.pressure_angle, this.diametral_pitch, this.center, this.position)
    this.update()
}

  get_stroke = () => {
    if(this.is_selected) {
        return "rgba(8, 8, 66, 0.75)"
    }
    return "black"
  }

  get_fill = () => {
    if(this.is_selected) {
        return "rgba(3, 0, 187, 0.67)"
    }
    return "rgba(0, 70, 200, 0.6)"
  }

  get_center_style = () => {
    return "white"
  }

  get_guide_style = () => {
    return "rgba(84, 84, 98, 0.5)"
  }


  to_string = () => {
    return `T:${this.total_teeth}\nRAV: ${this.rotation_animation_value}`
  }

  select = () => {
    this.is_selected = true 
    this.render()
  }

  deselect = () => {
    this.is_selected = false 
    this.render()
  }

  set_is_rotating = (value) => {
    this.is_rotating = value 
  }

  set_child = (gear) => {
    this.child = gear 
  }

  contains = (point) => {
    let distance_to_center = Math.hypot(point.x - this.position.x, point.y - this.position.y)

    return distance_to_center < this.radius
  }

  move_with_drag = (delta) =>{
    let new_position = new Point(this.start_drag_point.x + delta.x, this.start_drag_point.y + delta.y)
    this.position = new_position
  }


  update = (new_position=null) =>{
    if(new_position) {
      this.position = new_position
    }

    this.render()
  }


  destroy = () => {
    this.path = null 
    this.center_path = null 
    this.guide_path = null
  }

  render = () =>{
    try{
      this.draw_circles()
      this.draw_center()
      this.draw_text()
      this.draw_gear()
    } catch (e) {
      console.log("Colud not render: ", e)            
    }
  }

  export_center = () => {
    return `<path d="M${this.center.x-Constants.CENTERWIDTH} ${this.center.y} L${this.center.x+Constants.CENTERWIDTH} ${this.center.y} M${this.center.x} ${this.center.y-Constants.CENTERWIDTH} L${this.center.x} ${this.center.y+Constants.CENTERWIDTH}" style="fill:none;stroke:black;stroke-width:1"/>`
  }

  get_radius = () => {
    return this.radius
  }


  draw_circles = () => {

    let p = new Path2D()
    p.arc(this.center.x, this.center.y, this.radius, 0, Constants.TWOPI);
    this.guide_path = p 
  }
        
  draw_text = () => {
    this.text_path = new Path2D()
  }

  draw_center = () => {

    let length = 20
    this.center_path = new Path2D()
    this.center_path.moveTo(-length, 0)
    this.center_path.lineTo(length, 0)
    this.center_path.moveTo(0, -length)
    this.center_path.lineTo(0, length)
  }

  draw_gear = () => {

    let total_radius = this.radius + this.tooth_height

    let pts=[]
    let radInc = (Math.PI *2) / this.total_teeth
    let rads=0

    let tooth_rads = (this.tooth_angle / 90 ) * radInc

    for(let i=0; i< this.total_teeth; i++) {
      let innerx = this.center.x +  Math.cos(rads) * this.radius
      let innery = this.center.y + Math.sin(rads) * this.radius

      let outerx = this.center.x + Math.cos(rads+tooth_rads) * total_radius
      let outery = this.center.y + Math.sin(rads+tooth_rads) * total_radius

      let lastx = this.center.x + Math.cos(rads+radInc) * this.radius
      let lasty = this.center.y + Math.sin(rads+radInc) * this.radius

      pts.push(new Point(innerx, innery))
      pts.push(new Point(outerx, outery))
      pts.push(new Point(lastx, lasty))

      rads+=radInc      
    }

    this.vertices = pts
    let p = ""
    let first = true;
    pts.forEach(item => {
      if(first) {
        p += item.move_to_svg()
        first = false;
      } else {
        p += item.line_to_svg()
      }
    })
    p += ' Z'
    this.path = new Path2D(p)
  }
}