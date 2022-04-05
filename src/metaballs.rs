extern crate glium;


pub trait Animatable {
    fn animate(&mut self, frame_time: f32);
}

pub struct Material {
    pub color: [f32; 3],
    pub roughness: f32,
}

type AnimateFn<T> = fn(object: &mut T, frame_time:f32);

pub struct Metaball {
    pub charge_pos: [f32; 3],
    pub strength: f32,
    pub material: Material,
    pub anim_func: AnimateFn<Metaball>,
    pub number: f32,
}

impl Animatable for Metaball {
    fn animate(&mut self, frame_time: f32){
        (self.anim_func)(self, frame_time);
    }
}
