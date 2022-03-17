use crate::glium;
use crate::metaballs::{Metaball};


pub struct Uniforms {
    pub metaballs: Vec<Metaball>,
    pub img_plane_z: f32,
    pub camera_transform: [[f32; 4]; 4],
    pub threshold: f32,
    pub screen_width: u32,
    pub screen_height: u32,
}

impl glium::uniforms::Uniforms for Uniforms {
    fn visit_values<'a, F: FnMut(&str, glium::uniforms::UniformValue<'a>)>(&'a self, mut f: F){
        f("screenWidth", glium::uniforms::UniformValue::UnsignedInt(self.screen_width));
        f("screenHeight", glium::uniforms::UniformValue::UnsignedInt(self.screen_height));
        f("imgPlaneZ", glium::uniforms::UniformValue::Float(self.img_plane_z));
        f("cameraMat", glium::uniforms::UniformValue::Mat4(self.camera_transform));
        f("threshold", glium::uniforms::UniformValue::Float(self.threshold));
        for i in 0..self.metaballs.len(){
            f(&format!("metaballs[{}].chargePos", i), glium::uniforms::UniformValue::Vec3(self.metaballs[i].charge_pos));
            f(&format!("metaballs[{}].strength", i), glium::uniforms::UniformValue::Float(self.metaballs[i].strength));
            f(&format!("metaballs[{}].color", i), glium::uniforms::UniformValue::Vec4(self.metaballs[i].color));
        }
    }
}
