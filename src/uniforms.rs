use crate::glium;
use crate::metaballs::{Metaball};
use crate::lights::{PointLight};
use crate::glm;


pub struct Uniforms {
    pub metaballs: Vec<Metaball>,
    pub point_lights: Vec<PointLight>,
    pub background_texture: glium::texture::SrgbTexture2d,
    pub img_plane_z: f32,
    pub camera_pos: glm::Vec3,
    pub camera_rot_axis: glm::Vec3,
    pub camera_rot_angle: f32,
    pub threshold: f32,
    pub screen_width: u32,
    pub screen_height: u32,
}

impl glium::uniforms::Uniforms for Uniforms {
    fn visit_values<'a, F: FnMut(&str, glium::uniforms::UniformValue<'a>)>(&'a self, mut f: F){
        f("screenWidth", glium::uniforms::UniformValue::UnsignedInt(self.screen_width));
        f("screenHeight", glium::uniforms::UniformValue::UnsignedInt(self.screen_height));
        f("imgPlaneZ", glium::uniforms::UniformValue::Float(self.img_plane_z));
        f("bgTex", glium::uniforms::UniformValue::SrgbTexture2d(&self.background_texture, None));

        let camera_mat = glm::translation(&self.camera_pos) * glm::rotation(self.camera_rot_angle, &self.camera_rot_axis);
        f("cameraMat", glium::uniforms::UniformValue::Mat4(camera_mat.into()));
        f("threshold", glium::uniforms::UniformValue::Float(self.threshold));

        for i in 0..self.metaballs.len(){
            f(&format!("metaballs[{}].chargePos", i), glium::uniforms::UniformValue::Vec3(self.metaballs[i].charge_pos));
            f(&format!("metaballs[{}].strength", i), glium::uniforms::UniformValue::Float(self.metaballs[i].strength));
            f(&format!("metaballs[{}].material.color", i), glium::uniforms::UniformValue::Vec3(self.metaballs[i].material.color));
            f(&format!("metaballs[{}].material.roughness", i), glium::uniforms::UniformValue::Float(self.metaballs[i].material.roughness));
        }

        for i in 0..self.point_lights.len(){
            f(&format!("pointLights[{}].pos",i), glium::uniforms::UniformValue::Vec3(self.point_lights[i].pos));
            f(&format!("pointLights[{}].color",i), glium::uniforms::UniformValue::Vec3(self.point_lights[i].color));
            f(&format!("pointLights[{}].intensity",i), glium::uniforms::UniformValue::Float(self.point_lights[i].intensity));
        }
    }
}
