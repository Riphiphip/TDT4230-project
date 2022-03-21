extern crate glium;

pub struct Material {
    pub color: [f32; 3],
    pub roughness: f32,
}

pub struct Metaball {
    pub charge_pos: [f32; 3],
    pub strength: f32,
    pub material: Material,
}
