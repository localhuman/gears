export class Point {
    constructor(x, y, decimals=5){
        this.x = x
        this.y = y
        this.decimals = decimals
    }

    copy = () =>{
        return new Point(this.x, this.y, this.decimals)
    }

    move_to_svg = () => {
        return `M${this.x} ${this.y}`
    }

    line_to_svg = () => {
        return `L${this.x} ${this.y}`
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
}


export const Constants = {

    WIDTH:1000,
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
export const generate_gear_name = (prefix='Gear') => {
    gear_count++;
    return `${prefix}_${gear_count}`
}

export class Gear{

    total_teeth  = 20
    pressure_angle = 14.5
    diametral_pitch = .1
    m = null
    center = null
    position = null 

    vertices = null

    is_dragging = false
    start_drag_point = null

    is_rotating = false
    rotation_animation_increment = 0.000
    rotation_animation_value = 0 
    connection_angle = 0

    is_selected = false 

    magic_number = 0.994
    child = null
    parent = null 
    name= null

    canvas_id = "canvas"


    path = null
    center_path = null
    guide_path = null


   constructor(total_teeth= 20, pressure_angle = 14.5, diametral_pitch=.1, center=new Point(0, 0), position = new Point(0, 0), parent = null, canvas_id = "canvas"){

        this.name = generate_gear_name()

        this.total_teeth = total_teeth
        this.pressure_angle = pressure_angle
        this.diametral_pitch = diametral_pitch
        this.vertices = []
        this.center = center
        this.position = position

        this.parent = parent
        this.canvas_id = canvas_id
        this.path = new Path2D()
        this.update_gear_ratio()
    }

    to_string = () => {
        return `${this.name}: Teeth ${this.total_teeth} at ${this.position.to_string()} M:: ${this.m} Parent: ${this.parent} Child: ${this.child}`
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
        let pitch_diameter = this.total_teeth / this.diametral_pitch
        let distance_to_center = Math.hypot(point.x - this.position.x, point.y - this.position.y)

        return distance_to_center < pitch_diameter
    }

    draw_ctx = () =>{
        const canvas = document.getElementById(this.canvas_id);
        return canvas.getContext("2d");
    }

    update_gear_ratio = () => {

        if (this.parent){
            //console.log("Updating gear ratio: with parent", this.to_string())
            let ratio = this.parent.total_teeth / this.total_teeth
            this.rotation_animation_increment = this.parent.rotation_animation_increment * -1 * ratio

            let self_teeth_odd = is_odd(this.total_teeth)
            let radians_to_rotate = Constants.TWOPI / (this.total_teeth * 2 )

            if(self_teeth_odd){
                this.rotation_animation_value = radians_to_rotate

                if(this.parent.rotation_animation_value != 0) {
                    this.rotation_animation_value = 0
                }

            }else{

                if(this.parent.rotation_animation_value != 0) {
                    this.rotation_animation_value = radians_to_rotate
                } else {
                    this.rotation_animation_value = 0
                }
            }
        }

        if(this.child){
            this.child.update_gear_ratio()
        }

        this.render()
    }

    update_connection_angle = (value) => {
        this.connection_angle = value
        if( this.parent) {
            let distance = this.get_radius() + this.parent.get_radius()
            let connection_angle_computed = Math.floor((this.connection_angle / 360 ) * this.total_teeth) * (360 / this.total_teeth)
            let connection_angle_radians = connection_angle_computed * Constants.PIOVERONEEIGHTY
            console.log("Connection angle computed ", connection_angle_computed)
            let nx = this.parent.position.x + (Math.cos(connection_angle_radians) * distance)
            let ny = this.parent.position.y + (Math.sin(connection_angle_radians) * distance)
            let new_position = new Point(nx, ny)
            this.update_position(new_position, false, self)
        }
    }

    update_position = (new_position, move_family, caller) => {
        this.position = new_position

        if(move_family && this.parent && caller != this.parent){
            

            let newX = this.position.x - this.get_radius() - this.parent.get_radius()
            new_position = new Point(newX, this.position.y)
            this.parent.update_position(new_position, move_family, this)
        }

        if(move_family && this.child && caller != this.child) {
            let newX = this.position.x + this.get_radius() + this.child.get_radius()
            new_position = new Point(newX, this.position.y)
            this.child.update_position(new_position, move_family, self)
        }

        this.render()
    }

    tick = () => {
        if(this.is_rotating && !this.is_dragging) {
            this.rotation_animation_value = this.rotation_animation_value + this.rotation_animation_increment
            this.render()
        }
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
            this.draw_gear()
        } catch (e) {
            console.log("Colud not render: ", e)            
        }
    }

    export_center = () => {
        return `<path d="M${this.center.x-Constants.CENTERWIDTH} ${this.center.y} L${this.center.x+Constants.CENTERWIDTH} ${this.center.y} M${this.center.x} ${this.center.y-Constants.CENTERWIDTH} L${this.center.x} ${this.center.y+Constants.CENTERWIDTH}" style="fill:none;stroke:black;stroke-width:1"/>`
    }

    get_radius = () => {
        return this.total_teeth / this.diametral_pitch
    }

    get_stroke = () => {
        if(this.is_selected) {
            return "rgba(8, 8, 66, 0.75)"
        }
        return "black"
    }

    get_fill = () => {
        if(this.is_selected) {
            return "rgba(0, 132, 239, 0.5)"
        }
        return "rgba(0, 0, 200, .5)"
    }

    get_center_style = () => {
        return "rgba(200,200,230,.9)"
    }

    get_guide_style = () => {
        return "rgba(84, 84, 98, 0.5)"
    }

    draw_circles = () => {
        const pressure_angle_radians = this.pressure_angle * Constants.PIOVERONEEIGHTY

        //m is 1 / Diametral pitch
        this.m = 1 / this.diametral_pitch
        const pitch_diameter = this.total_teeth / this.diametral_pitch

        const addendum = this.m 
        const dedendum = this.m * 1.25

        const outside_diameter = pitch_diameter + ( 2 * addendum )
        const root_diameter = pitch_diameter  - (2 * dedendum )
        let base_radius = Math.cos(pressure_angle_radians) * pitch_diameter

        let p = new Path2D()

        p.arc(this.center.x, this.center.y, pitch_diameter, 0, Constants.TWOPI);
        p.arc(this.center.x, this.center.y, base_radius, 0, Constants.TWOPI);
        p.arc(this.center.x, this.center.y, outside_diameter, 0, Constants.TWOPI);

        this.guide_path = p 
    }
        

    draw_center = () => {
        let length = this.m * 3
        this.center_path = new Path2D()
        this.center_path.moveTo(-length, 0)
        this.center_path.lineTo(length, 0)
        this.center_path.moveTo(0, -length)
        this.center_path.lineTo(0, length)
    }

    draw_gear = () => {

        this.vertices = []

        const  pressure_angle_radians = this.pressure_angle * Constants.PIOVERONEEIGHTY

        //m is 1 / Diametral pitch
        this.m = 1 / this.diametral_pitch
        const  pitch_diameter = this.total_teeth / this.diametral_pitch

        const addendum = this.m 
        const dedendum = this.m * 1.25

        const outside_radius = pitch_diameter + ( 2 * addendum )
        const root_radius = pitch_diameter  - (2 * dedendum )

        const base_radius = Math.cos(pressure_angle_radians) * pitch_diameter
        
        const lengthAdjacent = Math.sin(pressure_angle_radians) * pitch_diameter

        let center_offset = (1+ (base_radius - root_radius ) / (pitch_diameter - root_radius)) * .5
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
                
                if(distance_to_center > outside_radius){                                                                
                    let angle_to_center = Math.atan2(ly - this.center.y, lx - this.center.x)
                    lx = this.center.x  + Math.cos(angle_to_center) * outside_radius
                    ly = this.center.y + Math.sin(angle_to_center) * outside_radius
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

        let fill_color = Constants.GEAR_FILL
        if(this.is_selected){
            fill_color = Constants.GEAR_FILL_SELECTED
        }

        let p = ""
        let first = true;
        all_pts.forEach(item => {
            if(first) {
                p += item.move_to_svg()
                first = false;
            } else {
                p += item.line_to_svg()
            }
        })

        this.path = new Path2D(p)
        //console.log("Rendered: ", this.to_string())
    }
}