import { Point, Constants, generate_gear_name, points_to_path, points_from_arc } from "/js/gear.js"

import { PointVec2D, InterSection2D, Intersect2DResult } from "/js/util/intersect.js"

export class Escapement {

  total_teeth  = 30
  tooth_height = 50
  tooth_angle = 17

  tooth_undercut_angle = 90

  tooth_width = 0.02
  total_radius = 0
  radius = 200

  total_spokes = 5

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

  svg_to_draw = null 
  img = null 
  last_svg = null 

  shape_points = null

  tooth_points = null 

  pallet = null

  settings = null

  constructor(settings, center, position){

    this.name = generate_gear_name('escapement')

    this.vertices = []
    this.center = center
    this.position = position

    this.path = new Path2D()

    this.pallet = new GrahamPallet(this, settings)
    this.update(settings)
}

  get_stroke = () => {
    return "#E0DFD5"
  }

  get_fill = () => {
    return "#E0DFD5"
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


  update = (settings) =>{


    this.settings = settings
    this.total_teeth = settings.total_teeth
    this.tooth_height = settings.tooth_height
    this.tooth_angle = settings.tooth_angle
    this.tooth_undercut_angle = settings.tooth_undercut_angle
    this.tooth_width = settings.tooth_width
    this.total_spokes = settings.spokes
    this.radius = settings.radius

    this.pallet.update(this.settings)
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
      this.draw_spokes()
      this.to_svg()

      this.pallet.render()

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

  to_svg = () => {

    this.img = new Image(this.tooth_height.total_radius * 2, this.total_radius * 2)

let svg = 
`<svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="${this.total_radius*2}"
    height="${this.total_radius*2}"
    viewBox="${this.center.x -this.total_radius} ${this.center.y -this.total_radius} ${this.total_radius*2} ${this.total_radius*2}"
    fill="none"
    fill-rule="evenodd">
    <path d="${this.p} ${this.spoke_path}" stroke="${this.get_stroke()}" stroke-width="1" fill="${this.get_fill()}"/>
</svg>`

    if(svg == this.last_svg){
      return
    }

    this.last_svg = svg
    let blob = new Blob([svg], {type: 'image/svg+xml'});
    let url = URL.createObjectURL(blob);
    this.img.src = url;

    this.img.onload = () => {
        this.svg_to_draw = this.img
    }       
  }


  draw_spokes = () => {

    let radians_per_spoke = Constants.TWOPI / this.total_spokes

    let padding_factor = .05
    let radians = 0
    let steps = 50
    let step = radians_per_spoke / steps
    let innerRadius = this.radius * ( padding_factor * 4)
    let outerRadius = this.radius * ( 1 - padding_factor * 2.5)

    let spoke_padding = this.radius * padding_factor

    let paths = []
    for(let i= 0; i< this.total_spokes; i++) {
      let innerPts = []
      let outerPts = []
      let next_stop = radians + radians_per_spoke

      let firstInnerPtX = this.center.x + Math.cos(radians) * innerRadius
      let firstInnerPtY = this.center.y + Math.sin(radians) * innerRadius

      let nextInnerPtX = this.center.x + Math.cos(radians + radians_per_spoke) * innerRadius
      let nextInnerPtY = this.center.y + Math.sin(radians + radians_per_spoke) * innerRadius

      let firstOuterPtX = this.center.x + Math.cos(radians) * outerRadius
      let firstOuterPtY = this.center.y + Math.sin(radians) * outerRadius

      let nextOuterPtX = this.center.x + Math.cos(radians + radians_per_spoke) * outerRadius
      let nextOuterPtY = this.center.y + Math.sin(radians + radians_per_spoke) * outerRadius

      let ip1 = new Point(firstInnerPtX, firstInnerPtY)
      let ip2 = new Point(nextInnerPtX, nextInnerPtY)
      let op1 = new Point(firstOuterPtX, firstOuterPtY)
      let op2 = new Point(nextOuterPtX, nextOuterPtY)

      for(let j=0; j < steps; j++) {
        radians += step

        let ipx = this.center.x + Math.cos(radians) * innerRadius
        let ipy = this.center.y + Math.sin(radians) * innerRadius

        let opx = this.center.x + Math.cos(radians) * outerRadius
        let opy = this.center.y + Math.sin(radians) * outerRadius

        let innerPoint = new Point(ipx, ipy)
        let outerPoint = new Point(opx, opy)


        if(innerPoint.distance(ip1) > spoke_padding && innerPoint.distance(ip2) > spoke_padding) {
          innerPts.push(new Point(ipx, ipy))
        }

        if(outerPoint.distance(op1) > spoke_padding && outerPoint.distance(op2) > spoke_padding) {
          outerPts.push(new Point(opx, opy))
        }
      }

      outerPts.reverse()
      let spokePoints = innerPts.concat(outerPts)
      let spokePath = points_to_path(spokePoints)
      paths.push(spokePath)
    }
    
    let center_points = []
    let center_rads = 0
    let center_radius = this.radius * .1
    step = Constants.TWOPI / steps
      for(let i = 0; i<steps; i++) {
      center_points.push(
        new Point(this.center.x + Math.cos(center_rads) *  center_radius, this.center.y + Math.sin(center_rads) * center_radius)
      )
      center_rads += step
    }
    let center_path = points_to_path(center_points)
    paths.push(center_path)
    this.spoke_path = paths.join(' ')
  }


  draw_gear = () => {

    this.total_radius = this.radius + this.tooth_height

    let tooth_angle_radians = this.tooth_angle * Constants.PIOVERONEEIGHTY
    let tooth_undercut_radians = this.tooth_undercut_angle * Constants.PIOVERONEEIGHTY 

    let pts=[]
    let radInc = (Math.PI *2) / this.total_teeth
    let rads=0

    this.tooth_points = []

    for(let i=0; i< this.total_teeth; i++) {
      let innerx = this.center.x +  Math.cos(rads) * this.radius
      let innery = this.center.y + Math.sin(rads) * this.radius


      let tp1x = innerx + Math.cos(rads + tooth_angle_radians) * this.tooth_height
      let tp1y = innery + Math.sin(rads + tooth_angle_radians) * this.tooth_height

      // get radians of this point
      let angle_at_tooth = Math.atan2(tp1y - this.center.y, tp1x - this.center.x)

      // now add tooth_width to this
      let radians_at_tooth_width = angle_at_tooth + this.tooth_width
      let tp2x = this.center.x + Math.cos(radians_at_tooth_width) * this.total_radius
      let tp2y = this.center.y + Math.sin(radians_at_tooth_width) * this.total_radius


      let angle_to_inner_point = rads + Math.PI/2 + tooth_undercut_radians
      
      let ip1x = tp2x + Math.cos(angle_to_inner_point) * this.tooth_height
      let ip1y = tp2y + Math.sin(angle_to_inner_point) * this.tooth_height

      let lastx = this.center.x + Math.cos(rads+radInc) * this.radius
      let lasty = this.center.y + Math.sin(rads+radInc) * this.radius

      pts.push(new Point(innerx, innery))
      pts.push(new Point(tp1x, tp1y))
      pts.push(new Point(tp2x, tp2y))
      pts.push(new Point(ip1x, ip1y))

      this.tooth_points.push([new Point(innerx, innery),new Point(tp1x, tp1y),new Point(tp2x, tp2y),new Point(ip1x, ip1y)])
      rads+=radInc      
    }

    this.shape_points = pts
    this.p = points_to_path(pts)
    this.path = new Path2D(this.p)
  }




}



export class GrahamPallet {

  escapement = null 
  total_radius = 0
  center = null 
  pallet_center = null

  path = null
  center_path = null 

  fork_degrees = 2.25

  rotation = 0

  fillStyle = '#F09D51'
  strokeStyle = '#F09D51'

  part1 = null 
  part2 = null
  part3 = null
  part4 = null 



  pendulum_spine = null
  pendulum_ball = null 

  counterweight_center = null 
  counterweight = null
  counterweight_radius = 31.50

  pendulum_offset = 3.31
  pendulum_radius = 59

  finger_offset = 1.5

  settings = null 

  constructor(escapement, settings) {
    this.escapement = escapement
    this.update(settings)
    this.render()
  }

  update = (settings) => {
    this.settings = settings
    this.fork_degrees = settings.fork_degrees
    this.finger_offset = settings.finger_offset
    this.pendulum_offset = settings.pendulum_offset
    this.pendulum_radius = settings.pendulum_radius
    this.counterweight_radius = settings.counterweight_radius



  }

  render = () => {
    this.draw_pallet()
    this.draw_pendulum()
    this.draw_counterweight()
  }

  draw_pendulum = () => {
    this.pendulum_spine = new Path2D()
    this.pendulum_spine.rect(this.pallet_center.x -5, this.pallet_center.y + 5, 10, 800)

    let offsetY = this.total_radius * this.pendulum_offset
    this.pendulum_ball = new Path2D()
    this.pendulum_ball.arc(this.pallet_center.x, this.pallet_center.y + offsetY, this.pendulum_radius, 0, Constants.TWOPI )
  }

  draw_counterweight = () => {
    this.counterweight = new Path2D()
    this.counterweight.arc(this.counterweight_center.x, this.counterweight_center.y, this.counterweight_radius, 0, Constants.TWOPI)
  }

  draw_pallet = () =>{
    this.total_radius = this.escapement.total_radius
    this.center = this.escapement.center

    let distance_to_pallet_center = this.total_radius * Math.sqrt(2)
    let pallet_center = new Point(this.center.x, this.center.y - distance_to_pallet_center)
    this.pallet_center = pallet_center
    
    let length = this.total_radius * 1.3

    let fo = Constants.PIOVERONEEIGHTY * this.finger_offset

    const a45 = ( Math.PI * 1/4 ) - fo
    const a135 = ( Math.PI * 3/4 ) + fo
    const a315 = Constants.TWOPI - a45
    const a225 = Constants.TWOPI - a135
    let mThree = this.fork_degrees * Constants.PIOVERONEEIGHTY
  
    let lpxA = pallet_center.x + Math.cos(a135-mThree) * length
    let lpyA = pallet_center.y + Math.sin(a135-mThree) * length
    let lpx = pallet_center.x + Math.cos(a135) * length
    let lpy = pallet_center.y + Math.sin(a135) * length
    let lpxB = pallet_center.x + Math.cos(a135+mThree) * length
    let lpyB = pallet_center.y + Math.sin(a135+mThree) * length
  
    // for the right point we want
    // it to be just a bit farther out
    let rpxA = pallet_center.x + Math.cos(a45-mThree) * length
    let rpyA = pallet_center.y + Math.sin(a45-mThree) * length
    let rpx = pallet_center.x + Math.cos(a45) * length
    let rpy = pallet_center.y + Math.sin(a45) * length
    let rpxB = pallet_center.x + Math.cos(a45+mThree) * length
    let rpyB = pallet_center.y + Math.sin(a45+mThree) * length
  
  
    let lp1 = new Point(lpx, lpy)
    let rp1 = new Point(rpx, rpy)
    let lpA = new Point(lpxA, lpyA)
    let rpA = new Point(rpxA, rpyA)
    let lpB = new Point(lpxB, lpyB)
    let rpB = new Point(rpxB, rpyB)
  
  //
    let blp = new Point(this.center.x + Math.cos(a225) * length,  this.center.y + Math.sin(a225) * length)
    let blpA = new Point(this.center.x + Math.cos(a225-mThree) * length,  this.center.y + Math.sin(a225-mThree) * length)
    let blpB = new Point(this.center.x + Math.cos(a225+mThree) * length,  this.center.y + Math.sin(a225+mThree) * length)
  
    let brp = new Point(this.center.x + Math.cos(a315) * length, this.center.y + Math.sin(a315) * length)
    let brpA = new Point(this.center.x + Math.cos(a315-mThree) * length, this.center.y + Math.sin(a315-mThree) * length)
    let brpB = new Point(this.center.x + Math.cos(a315+mThree) * length, this.center.y + Math.sin(a315+mThree) * length)
  
  
    // this is the left palate finger left side
    let i1 = InterSection2D.intersect2D(
      new PointVec2D(this.center.x, this.center.y), 
      new PointVec2D(blpA.x, blpA.y), 
      new PointVec2D(pallet_center.x, pallet_center.y),
      new PointVec2D(lpB.x, lpB.y))
    // left palate finger right side
    let i2 = InterSection2D.intersect2D(
      new PointVec2D(this.center.x, this.center.y), 
      new PointVec2D(blpB.x, blpB.y), 
      new PointVec2D(pallet_center.x, pallet_center.y),
      new PointVec2D(lpA.x, lpA.y))
  
    // this is the right palate finger left side
    let i3 = InterSection2D.intersect2D(
      new PointVec2D(this.center.x, this.center.y), 
      new PointVec2D(brpB.x, brpB.y), 
      new PointVec2D(pallet_center.x, pallet_center.y),
      new PointVec2D(rpB.x, rpB.y))
    // right palate finger right side
    let i4 = InterSection2D.intersect2D(
      new PointVec2D(this.center.x, this.center.y), 
      new PointVec2D(brpA.x, brpA.y), 
      new PointVec2D(pallet_center.x, pallet_center.y),
      new PointVec2D(rpA.x, rpA.y))
       

    // get distance to center point for left side outer
    let d1 = Math.hypot(i1.x - pallet_center.x, i1.y - pallet_center.y)
    // get distance to center point for left side outer
    let d2 = Math.hypot(i2.x - pallet_center.x, i2.y - pallet_center.y)  

    // distance to center for right side outer
    let d3 = Math.hypot(i3.x - pallet_center.x, i3.y - pallet_center.y)
    let d4 = Math.hypot(i4.x - pallet_center.x, i4.y - pallet_center.y)
  
    
    let a20 = 13 * Constants.PIOVERONEEIGHTY
    let a25 = 20 * Constants.PIOVERONEEIGHTY
    let pallet_size = this.total_radius / 10

    let plist = [
      // top center
      new Point(pallet_center.x, pallet_center.y - pallet_size), 
      // top right
      new Point(pallet_center.x + Math.cos(a20) * d3, pallet_center.y + Math.sin(a20) * d3),    
    ]
    //outside right curve
    let curve = points_from_arc(pallet_center,d3, a20, a45+mThree, false)
    plist = plist.concat(curve)

    // right finger
    plist.push(new Point(i4.x, i4.y))
//    plist.push(new Point(i3.x, i3.y))

    // //inside right curve
    curve = points_from_arc(pallet_center, d4, a25, a45-mThree, true)
    plist = plist.concat(curve)
    
    // back to bottom center
    plist.push(new Point(pallet_center.x, pallet_center.y + pallet_size))

    // out to left finger and down
    plist.push( new Point(pallet_center.x + Math.cos(Math.PI - a25) * d2, pallet_center.y + Math.sin(Math.PI - a25) * d2))
    curve = points_from_arc(pallet_center, d2, a135 - mThree, Math.PI - a25, true)
    plist = plist.concat(curve)

    // left finger
    plist.push(new Point(i2.x, i2.y))
    plist.push(new Point(i1.x, i1.y))

    curve = points_from_arc(pallet_center, d1, a135 + mThree, Math.PI - a20, false)
    plist = plist.concat(curve)
    plist.push(new Point(pallet_center.x, pallet_center.y - pallet_size))

    // d.arc(pallet_center.x, pallet_center.y, d1, a135+mThree, Math.PI - a20, false)
    // d.lineTo(pallet_center.x, pallet_center.y - pallet_size)
    // this.path = d
    let plistPath = points_to_path(plist)
    this.path = new Path2D(plistPath)


    this.center_path = new Path2D()
    this.center_path.arc(pallet_center.x, pallet_center.y, 5, 0, Constants.TWOPI)



    let outsideRightCorner = new Point(pallet_center.x + Math.cos(a20) * d3, pallet_center.y + Math.sin(a20) * d3)

    // //inside right curve
    curve = points_from_arc(pallet_center, d4, a25, a45-mThree, true)
    //inside rightCorner
    let insideRightCorner = curve.reverse()[0]    
    // back to bottom center
    curve = points_from_arc(pallet_center, d1, a135 + mThree, Math.PI - a20, false)
    let outsideLeftCorner = curve.reverse()[0]
    curve = points_from_arc(pallet_center, d2, a135 - mThree, Math.PI - a25, true)
    let insideLeftCorner = curve[0]

    // top right arm
    this.part1 = [
      new Point(pallet_center.x, pallet_center.y - pallet_size), 
      outsideRightCorner,  
      insideRightCorner,
      new Point(pallet_center.x, pallet_center.y + pallet_size),
    ]

    // top left arm
    this.part2 = [
      new Point(pallet_center.x, pallet_center.y - pallet_size), 
      outsideLeftCorner,    
      insideLeftCorner,
      new Point(pallet_center.x, pallet_center.y + pallet_size),
    ]


    // right finger outside
    curve = points_from_arc(pallet_center,d3, a20, a45+mThree, false,3)
    //right finger inside
    let curve2 = points_from_arc(pallet_center, d4, a25, a45-mThree, true, 3)

    this.part3 = [
      curve[0],
      curve[1],
      curve[2],
      new Point(i4.x, i4.y),
      //    plist.push(new Point(i3.x, i3.y))
      new Point(i3.x, i3.y),      
      curve2[0],
      curve2[1],
      curve2[2],
    ]

    // left finger
    curve = points_from_arc(pallet_center, d2, a135 - mThree, Math.PI - a25, true, 4)
    curve2 = points_from_arc(pallet_center, d1, a135 + mThree, Math.PI - a20, false, 4)


    this.part4 = [
      curve[0],
      curve[1],
      curve[2],
      curve[3],
      curve2[0],
      curve2[1],
      curve2[2],
      curve2[3],

    ]
    this.counterweight_center = outsideRightCorner


  }
}