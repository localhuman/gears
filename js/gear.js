export class Point {
    constructor(x, y, decimals=5){
        this.x = parseFloat(x)
        this.y = parseFloat(y)
        this.decimals = parseFloat(decimals)
    }

    get_x = () => {
        return this.x
    }

    get_y = () => {
        return this.y
    }

    scale = (value) => {
        this.x = this.x * value
        this.y = this.y * value 
    }

    scaleNegY = (value) => {
        this.x = this.x * value
        this.y = this.y * -value 
    }


    translate = (pt) => {
        this.x = this.x + pt.x
        this.y = this.y + pt.y
    }

    copy = () =>{
        return new Point(this.x, this.y, this.decimals)
    }

    move_to_svg = () => {
        return `M${this.x.toFixed(this.decimals)} ${this.y.toFixed(this.decimals)}`
    }

    line_to_svg = () => {
        return ` L${this.x.toFixed(this.decimals)} ${this.y.toFixed(this.decimals)}`
    }

    to_point = () => {
        return (this.x, this.y)
    }

    to_array = () => {
        return [this.x, this.y]
    }

    to_string = () => {
        return `Point: ${this.x} ${this.y}`
    }

    distance = (pt) => {
        return Math.hypot(pt.x - this.x, pt.y - this.y)
    }
}


export const Constants = {

    WIDTH:1400,
    HEIGHT:1000,
    CENTERX : 1000/2,
    CENTERY : 1000/2,
    CENTERWIDTH : 10,
    TWOPI : Math.PI * 2,
    ONEEIGHTYOVERPI : 180 /  Math.PI, 
    PIOVERONEEIGHTY : Math.PI / 180,

    PX_TO_MM : 0.264583333,
    PX_TO_INCH : 25.4,

    WHITE : (255,255,255,255),
    BLUE : (0, 0, 255, 255),
    GREEN : (0, 255, 0, 255),
    YELLOW : (255, 255, 0, 255),
    BLACK : (0,0,0,255),
    RED : (255, 0,0, 255),

    GEAR_EDGE : (190, 190, 255, 255),
    GEAR_FILL : (120, 120, 170, 127),
    GEAR_FILL_SELECTED : (120, 120, 180, 180),

    TOOTH_SIDE_RIGHT:0,
    TOOTH_SIDE_LEFT:1
}





const is_odd = (value) => {
    return value % 2
}

let gear_count = 0
export const generate_gear_name = (prefix='G') => {
    gear_count++;
    return `${prefix}${gear_count}`
}

export const points_to_path = (pts) => {
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
    return p
}

export const points_from_arc = (center, radius, start_radians, end_radians, counterclockwise=false, steps=50) => {
    let sr = start_radians
    let er = end_radians
    let step = (er - sr) / (steps - 1)
    let current = sr
    let res = []
    for(let i=0; i<steps; i++) {
        let px = center.x + Math.cos(current) * radius 
        let py = center.y + Math.sin(current) * radius
        res.push(new Point(px, py))
        current += step
    }
    if(counterclockwise) {
        res.reverse()
    }
    return res
}


export class Gear{

    total_teeth  = 30
    pressure_angle = 14.5
    diametral_pitch = .5
    m = 2
    center = null
    position = null 

    vertices = null

    is_dragging = false
    start_drag_point = null

    is_rotating = false
    rotation_animation_increment = 0.000
    rotation_animation_value = 0 
    connection_angle = 0
    connection_angle_radians = 0
    connection_flag = 0

    tooth_height = 0
    pitch_radius = 0
    outside_radius = 0 
    outside_diameter = 0


    is_selected = false 

    magic_number = 1
    child = null
    parent = null 
    name= null

    path = null
    
    center_points = null
    center_path = null

    guide_points = ''
    guide_path = null

    text_path = null
    text_color = "white"

    previous_svg = null 

    svg_path = null 

    svg_to_draw = null


    total_spokes = 3
    spoke_path = null

    show_text = true
    show_guides = false

    constructor(total_teeth= 20, pressure_angle = 14.5, m=2, center=new Point(0, 0), position = new Point(0, 0), parent = null){

        this.name = generate_gear_name()
        this.total_teeth = total_teeth
        this.pressure_angle = pressure_angle
        this.m = m
        this.diametral_pitch = 1/this.m
        this.vertices = []
        this.center = center
        this.position = position

        this.parent = parent
        this.path = new Path2D()

        //console.log("Created gear: ", this.total_teeth, this.pressure_angle, this.diametral_pitch, this.center, this.position)
        this.update()
    }

    get_stroke = () => {
        if(this.is_selected) {
            return "rgba(19, 34, 75, 0.8)"
        }
        return "rgba(19, 34, 75, 0.8)"
    }

    get_fill = () => {
        if(this.is_selected) {
            return "rgba(49, 128, 202, 0.8)"
        }
        return "rgba(44, 98, 150, 0.9)"
    }

    get_center_style = () => {
        return "white"
    }

    get_guide_style = () => {
        return "rgba(0, 0, 0, 0.3)"
    }

    to_string = () => {
        return `${this.name} T:${this.total_teeth} M:${this.m} PA:${this.pressure_angle}`
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

        return distance_to_center < this.pitch_radius
    }

    move_with_drag = (delta) =>{
        let new_position = new Point(this.start_drag_point.x + delta.x, this.start_drag_point.y + delta.y)
        this.position = new_position
        if(this.child){
            this.child.move_with_drag(delta)
        }
    }


    update = (new_position=null) =>{
        if(new_position) {
            this.position = new_position
        }
        let connection_angle_computed = Math.floor((this.connection_angle / 360 ) * this.total_teeth) * (360 / this.total_teeth)
        this.connection_angle_radians = connection_angle_computed * Constants.PIOVERONEEIGHTY

        if(this.parent) {

            let distance = this.get_radius() + this.parent.get_radius()
            let nx = (this.parent.position.x + (Math.cos(this.connection_angle_radians + this.parent.rotation_animation_value )  * distance)).toFixed(2)
            let ny = (this.parent.position.y + (Math.sin(this.connection_angle_radians + this.parent.rotation_animation_value ) * distance)).toFixed(2)
            let new_position = new Point(nx, ny)

            let ratio = this.parent.total_teeth / this.total_teeth
            this.rotation_animation_increment = this.parent.rotation_animation_increment * -1 * ratio

            this.rotation_animation_value = this.parent.rotation_animation_value + (this.connection_angle_radians * ratio)

             const tooth_extra = Constants.TWOPI / (this.total_teeth * 2)
             if( is_odd(this.total_teeth)){
                this.rotation_animation_value += tooth_extra
                this.connection_flag = true 
             } else if (this.parent.connection_flag) {
                this.connection_flag = false
             }

            this.position = new_position


        }

        if(this.child) {
            this.child.update()
        }

        this.render()
    }


    destroy = () => {
        this.path = null 
        this.center_path = null 
        this.guide_path = null
    }

    render = (force_reload_image=false) =>{
        try{
            this.draw_circles()
            this.draw_center()
            this.draw_text()
            this.draw_gear()
            this.draw_spokes()
            this.to_svg(force_reload_image)
        } catch (e) {
            console.log("Colud not render: ", e)            
        }
    }

    export_center = () => {
        return `<path d="M${this.center.x-Constants.CENTERWIDTH} ${this.center.y} L${this.center.x+Constants.CENTERWIDTH} ${this.center.y} M${this.center.x} ${this.center.y-Constants.CENTERWIDTH} L${this.center.x} ${this.center.y+Constants.CENTERWIDTH}" style="fill:none;stroke:black;stroke-width:1"/>`
    }

    get_radius = () => {
        this.diametral_pitch = 1 / this.m
        return this.total_teeth / this.diametral_pitch
    }


    draw_circles = () => {
        const pressure_angle_radians = this.pressure_angle * Constants.PIOVERONEEIGHTY

        //m is 1 / Diametral pitch
        //this.m = 1 / this.diametral_pitch
        this.diametral_pitch  = 1 / this.m
        this.pitch_radius = this.total_teeth / this.diametral_pitch

        const addendum = this.m 
        const dedendum = this.m * 1.25

        this.outside_radius = this.pitch_radius + ( 2 * addendum )
        this.outside_diameter = this.outside_radius * 2
        this.tooth_height = addendum + dedendum
        const root_radius = this.pitch_radius  - (2 * dedendum )
        let base_radius = Math.cos(pressure_angle_radians) * this.pitch_radius

        let p = new Path2D()

        p.arc(this.center.x, this.center.y, this.pitch_radius, 0, Constants.TWOPI);
        p.arc(this.center.x, this.center.y, base_radius, 0, Constants.TWOPI);
        p.arc(this.center.x, this.center.y, this.outside_radius, 0, Constants.TWOPI);

        this.guide_points = `
        <circle cx="${this.center.x}" cy="${this.center.y}" r="${this.pitch_radius}" stroke="${this.get_guide_style()}" stroke-width="1" style="fill:none;"/>
        <circle cx="${this.center.x}" cy="${this.center.y}" r="${base_radius}" stroke="${this.get_guide_style()}" stroke-width="1" style="fill:none;"/>
        <circle cx="${this.center.x}" cy="${this.center.y}" r="${this.outside_radius}" stroke="${this.get_guide_style()}" stroke-width="1" style="fill:none;"/>
        `

        this.guide_path = p 
    }
        


    draw_spokes = () => {

        const dedendum = this.m * 1.25
        const root_radius = this.pitch_radius  - (2 * dedendum )

        let radians_per_spoke = Constants.TWOPI / this.total_spokes

        let padding_factor = .075
        let radians = 0
        let steps = 100
        let step = radians_per_spoke / steps
        let innerRadius = root_radius * ( padding_factor * 4)
        let outerRadius = root_radius * ( 1 - padding_factor * 2.5)

        let spoke_padding = root_radius * padding_factor

        let paths = []
        for(let i= 0; i< this.total_spokes; i++) {
            let innerPts = []
            let outerPts = []

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
        
        this.spoke_path = paths.join(' ')
    }


    draw_text = () => {
        const dedendum = this.m * 1.25

        const root_radius = this.pitch_radius  - (2 * dedendum )
        let padding_factor = .075
        let outerRadius = root_radius * ( 1 - padding_factor * 1.8)

        let font_size = (this.m * this.total_teeth) / 10
        if(font_size < 1) {
            font_size = 1
        }

        this.text_path = !this.show_text ? '' : 
        `<path id="textArc_${this.name}" d="M${this.center.x -outerRadius} ${this.center.y} A ${outerRadius} ${outerRadius} 0 1 1 ${this.center.x} ${this.center.y + outerRadius}" style="fill:none"/>
        <text style="fill:${this.text_color};font-size:${font_size}px;">
            <textPath href="#textArc_${this.name}" textLength="auto" startOffset="0" font-family="Helvetica, sans-serif">${this.to_string()}</textPath>
         </text>`

    }

    to_svg = (force_reload_image=false) => {

        const guides = ! this.show_guides ? '' :
        `<path d="${this.center_points}" stroke="${this.get_guide_style()}" stroke-width="1"/> ${this.guide_points}`

        let svg = 
        `<svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="${this.center.x -this.outside_radius-1} ${this.center.y -this.outside_radius-1} ${this.outside_diameter+2} ${this.outside_diameter+2}" 
            fill="none"
            stroke="none"
            fill-rule="evenodd">
            
            <path d="${this.svg_path} ${this.spoke_path}" stroke="${this.get_stroke()}" stroke-width="1" fill="${this.get_fill()}"/>
            ${this.text_path}
            ${guides}
        </svg>`

        if(svg !== this.previous_svg || force_reload_image) {
            this.text_img = new Image(this.outside_radius*2, this.outside_radius*2)
            let blob = new Blob([svg], {type: 'image/svg+xml'});
            let url = URL.createObjectURL(blob);
            this.text_img.src = url;
    
            this.text_img.onload = () => {
                this.svg_to_draw = this.text_img
                this.previous_svg = svg
            }    
        } 
    }

    draw_center = () => {

        let length = this.m * 3

        this.center_points = `M${this.center.x-length} ${this.center.y} 
                                L${this.center.x+length} ${this.center.y} Z 
                                M${this.center.x} ${this.center.y-length}
                                L${this.center.x} ${this.center.y+length} Z`

        this.center_path = new Path2D(this.center_points)
    }


    draw_gear = () => {

        this.vertices = []

        const  pressure_angle_radians = this.pressure_angle * Constants.PIOVERONEEIGHTY

        //m is 1 / Diametral pitch
        //this.m = 1 / this.diametral_pitch

        this.diametral_pitch = 1 / this.m
        this.pitch_radius = this.total_teeth / this.diametral_pitch

        const addendum = this.m 
        const dedendum = this.m * 1.25

        this.outside_radius = this.pitch_radius + ( 2 * addendum )
        this.outside_diameter = this.outside_radius * 2

        // magic number is just a fudge factor to give smaller gears the tiniest bit more room to mesh
        // since a 1 pixel border messes the geometry a bit.
        // as the number of teeth approaches infinity the geometry becomes more perfect and needs less fudge.
        this.magic_number = 1 - (0.002 - (this.total_teeth / 200 * 0.002))
        if(this.magic_number > 1 ) 
            this.magic_number = 1

        const root_radius = this.pitch_radius  - (2 * dedendum )

        const base_radius = Math.cos(pressure_angle_radians) * this.pitch_radius
        
        const lengthAdjacent = Math.sin(pressure_angle_radians) * this.pitch_radius

        let center_offset = (1+ (base_radius - root_radius ) / (this.pitch_radius - root_radius)) * .5
        if(center_offset < 1){
            center_offset = 1
        }
        
        const involute_length = lengthAdjacent


        const make_tooth_side = (start_radians, iterations, step, side) => {
            let pts = []
            let do_break = false
            
            let rads = start_radians

            let irads = rads + (2 * Math.PI /3)            
            let radian_offset = -pressure_angle_radians * center_offset

            if(side == Constants.TOOTH_SIDE_LEFT){
                radian_offset =  pressure_angle_radians * center_offset
                rads -= Constants.TWOPI / this.total_teeth / 2
                irads = rads - (2 * Math.PI /3)
            }

            let ix = this.center.x + Math.cos(rads + radian_offset) * ( base_radius  )
            let iy = this.center.y + Math.sin(rads + radian_offset) * ( base_radius  )

            
            let undercut = false 

            if(this.total_teeth < 18 && this.pressure_angle < 18) {
                undercut = true             
            }
            
            for(let i=0; i<iterations; i++){
                let lx = ix + Math.cos(irads) * (involute_length * this.magic_number)
                let ly = iy + Math.sin(irads) * (involute_length * this.magic_number)
                
                // ctx.beginPath()
                // ctx.arc(lx, ly, 2, 0, Constants.TWOPI);
                // ctx.stroke()
        
                let distance_to_center = Math.hypot(lx - this.center.x, ly - this.center.y)
                
                if(distance_to_center > this.outside_radius){                                                                
                    let angle_to_center = Math.atan2(ly - this.center.y, lx - this.center.x)
                    lx = this.center.x  + Math.cos(angle_to_center) * this.outside_radius
                    ly = this.center.y + Math.sin(angle_to_center) * this.outside_radius
                    let tooth_edge = (lx, ly)
                    do_break = true
                }

                if(undercut) {
                    if(distance_to_center >= base_radius){
                        pts.push(new Point(lx, ly))
                    }
                }else{
                    if(distance_to_center >= root_radius){
                        pts.push(new Point(lx, ly))
                    }
                }

                if(do_break){            
                    break 
                }

                if(side == Constants.TOOTH_SIDE_RIGHT){
                    irads-=step
                }else{
                    irads+=step
                }
            }

            if(undercut){
                let urads = start_radians
                let ux = this.center.x + Math.cos(rads) * root_radius
                let uy = this.center.y + Math.sin(rads) * root_radius
                pts.splice(0, 0, new Point(ux, uy))
            }
            return pts
        }

        const make_tooth = (start_radians) => {
            const iterations = 130
            const step = 1 * Constants.PIOVERONEEIGHTY
                                    
            let tooth_pts = make_tooth_side(start_radians, iterations, step, Constants.TOOTH_SIDE_RIGHT)
            let tooth_pts_left = make_tooth_side(start_radians, iterations, step, Constants.TOOTH_SIDE_LEFT)            
            tooth_pts_left.reverse()

            tooth_pts = tooth_pts.concat(tooth_pts_left)
            return tooth_pts
        }
        

        let increment = Constants.TWOPI / this.total_teeth
        let rads = 0

        let all_pts = []

        for(let i=0; i<this.total_teeth; i++){
            all_pts = all_pts.concat(make_tooth(rads))
            rads -= increment
        }

        all_pts.push(all_pts[0].copy())
        this.vertices = all_pts

        let fill_color = Constants.GEAR_FILL
        if(this.is_selected){
            fill_color = Constants.GEAR_FILL_SELECTED
        }

        let p = points_to_path(all_pts)
        this.svg_path = p
        this.path = new Path2D(this.svg_path)
    }
}