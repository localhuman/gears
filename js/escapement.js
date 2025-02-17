import { Point, Constants, generate_gear_name } from "/js/gear.js"


export class Escapement {

  total_teeth  = 30
  tooth_height = 50
  tooth_angle = 15

  tooth_undercut_angle = 90

  tooth_width = 0.05

  radius = 200

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


  constructor(total_teeth= 30, tooth_height=50, tooth_angle=90, tooth_undercut_angle=15, tooth_width=0.05, radius=200, center, position){

    this.name = generate_gear_name('ratchet')

    this.total_teeth = parseInt(total_teeth)
    this.tooth_height = parseFloat(tooth_height)
    this.tooth_angle = parseFloat(tooth_angle)
    this.tooth_undercut_angle = parseFloat(tooth_undercut_angle)
    this.tooth_width = parseFloat(tooth_width)
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
    p.arc(this.center.x, this.center.y, this.radius + this.tooth_height, 0, Constants.TWOPI)
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

    let tooth_angle_radians = this.tooth_angle * Constants.PIOVERONEEIGHTY
    let tooth_undercut_radians = this.tooth_undercut_angle * Constants.PIOVERONEEIGHTY 

    let pts=[]
    let radInc = (Math.PI *2) / this.total_teeth
    let rads=0

    let tooth_rads = (this.tooth_angle / 90 ) * radInc

    for(let i=0; i< this.total_teeth; i++) {
      let innerx = this.center.x +  Math.cos(rads) * this.radius
      let innery = this.center.y + Math.sin(rads) * this.radius

      let tp1x = innerx + Math.cos(tooth_angle_radians) * this.tooth_height
      let tp1y = innery + Math.sin(tooth_angle_radians) * this.tooth_height


      // get radians of this point
      let angle_at_tooth = Math.atan2(tp1y - this.center.y, tp1x - this.center.x)
      console.log("Angle at tooth? ", angle_at_tooth)      

      // now add tooth_width to this
      let radians_at_tooth_width = angle_at_tooth + this.tooth_width
      let tp2x = this.center.x + Math.cos(radians_at_tooth_width) * total_radius
      let tp2y = this.center.y + Math.sin(radians_at_tooth_width) * total_radius


      let angle_to_inner_point = rads + Math.PI/2 + tooth_undercut_radians
      
      let ip1x = tp2x + Math.cos(angle_to_inner_point) * this.tooth_height
      let ip1y = tp2y + Math.sin(angle_to_inner_point) * this.tooth_height

      // let outerx = this.center.x + Math.cos(rads+tooth_rads) * total_radius
      // let outery = this.center.y + Math.sin(rads+tooth_rads) * total_radius

      let lastx = this.center.x + Math.cos(rads+radInc) * this.radius
      let lasty = this.center.y + Math.sin(rads+radInc) * this.radius

      pts.push(new Point(innerx, innery))
      pts.push(new Point(tp1x, tp1y))
      pts.push(new Point(tp2x, tp2y))
      pts.push(new Point(ip1x, ip1y))
//      pts.push(new Point(outerx, outery))
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