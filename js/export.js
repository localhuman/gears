
import {Point, Constants} from "./gear.js";


export const Exporter = {


    export_gear_svg: (gear, name) => {

        const radius = gear.outside_radius
        const diameter = radius * 2
        let old_text_color = gear.text_color
        gear.center = new Point(radius, radius)
        gear.text_color = "black"        
        gear.render()
        let gearpath = gear.svg_path
        const center = gear.export_center()

        let text = gear.text_path

        gear.center = new Point(0,0)
        gear.text_color = old_text_color
        gear.render()

        const filename = `${name}.svg`
        const path = `<path d="${gearpath}" style="fill:none;stroke:black;stroke-width:1"/>`
        const svg = 
`<svg xmlns="http://www.w3.org/2000/svg" height="${diameter}" width="${diameter}">
${path}
${center}
${text}
</svg>
`

        Exporter.download(svg, filename, 'image/svg+xml')
    },

    export_all_gears_svg: (gearsets, name, separate) => {

        const paths = gearsets.map( set => {
            let offset = new Point(0,0)

            return set.map( gear => {
                
                if(separate) {
                    offset = new Point(offset.x + gear.tooth_height *2, offset.y + gear.tooth_height*2)
                }        
                let old_text_color = gear.text_color
                gear.text_color = "black"
                gear.center = new Point(gear.position.x + offset.x, gear.position.y + offset.y)
                gear.render()
                let p =  `<path d="${gear.svg_path}" style="fill:none;stroke:black;stroke-width:1"/>`
                let c = gear.export_center()
                let text = gear.text_path

                gear.center = new Point(0,0)
                gear.text_color = old_text_color
                gear.render()
                return  p + c + text
            })
        })
        
        const filename = `${name}.svg`
        const svg = 
`<svg xmlns="http://www.w3.org/2000/svg" height="${Constants.WIDTH}" width="${Constants.HEIGHT}">
${paths.join('\n')}
</svg>
`

        Exporter.download(svg, filename, 'image/svg+xml')
    },

    download(file, filename, mime) {
        var element = document.createElement('a')
        element.setAttribute('href', `data:${mime};charset=utf-8,${encodeURIComponent(file)}`)
        element.setAttribute('download', filename)
        element.style.display = 'none';
        document.body.appendChild(element);
      
        element.click();
      
        document.body.removeChild(element);
    },
}