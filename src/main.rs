
extern crate glium;
extern crate nalgebra_glm as glm;
extern crate image;

mod metaballs;
mod uniforms;
mod lights;

#[derive(Copy, Clone)]
struct Vertex {
    position: [f32; 2],
}
glium::implement_vertex!(Vertex, position);

fn main() {
    use glium::glutin;

    let event_loop = glutin::event_loop::EventLoop::new();
    let window_builder = glutin::window::WindowBuilder::new();
    let context_builder = glutin::ContextBuilder::new();
    let display = glium::Display::new(window_builder, context_builder, &event_loop).unwrap();
    
    let canvas_verticies = vec![Vertex{position:[-1.0, -1.0]},Vertex{position:[1.0, -1.0]},Vertex{position:[1.0, 1.0]},Vertex{position:[-1.0, 1.0]}];
    let canvas_buffer = glium::VertexBuffer::new(&display, &canvas_verticies).unwrap();
    let canvas_indicies: [u16; 6] = [0, 1, 2, 2, 3, 0];
    let indicies = glium::index::IndexBuffer::new(&display, glium::index::PrimitiveType::TrianglesList, &canvas_indicies).unwrap();
    
    let background_tex_image = image::io::Reader::open("./res/textures/Free Panorama in Park (quarter res).jpg")
        .expect("Could not open background texture file")
        .with_guessed_format()
        .expect("Could not determine image format for background texture")
        .decode()
        .expect("Could not decode background texture image")
        .into_rgba8();
    let image_dims = background_tex_image.dimensions();
    let image = glium::texture::RawImage2d::from_raw_rgba_reversed(&background_tex_image, image_dims);
    let bg_tex = glium::texture::SrgbTexture2d::new(&display, image).unwrap(); 

    let mut program_uniforms: uniforms::Uniforms = uniforms::Uniforms {
        screen_width: display.get_framebuffer_dimensions().0,
        screen_height: display.get_framebuffer_dimensions().1,
        background_texture: bg_tex,
        img_plane_z: 1.0,
        camera_pos: glm::vec3(0.0, 0.0, -1.0),
        camera_rot_axis: glm::vec3(0.0, 1.0, 0.0),
        camera_rot_angle: 0.0,
        threshold: 10.0,
        metaballs: vec![
            metaballs::Metaball {
                charge_pos: [0.0, 0.0, 0.0],
                strength: 0.3,
                material: metaballs::Material {
                    color: [1.0, 0.0, 0.0],
                    roughness: 8.0,
                },
            },
            metaballs::Metaball {
                charge_pos: [0.0, 0.0, 0.0],
                strength: 0.3,
                material: metaballs::Material {
                    color: [0.0, 0.0, 1.0],
                    roughness: 10.0,
                },
            },
            metaballs::Metaball {
                charge_pos: [0.0, 0.0, 2.0],
                strength: 0.5,
                material: metaballs::Material {
                    color: [0.0, 0.0, 0.0],
                    roughness: 2.23606,
                },
            },
            metaballs::Metaball {
                charge_pos: [-0.5, -1.0, 2.5],
                strength: 0.5,
                material: metaballs::Material {
                    color: [0.0, 0.0, 0.0],
                    roughness: 2.23606,
                },
            },
            metaballs::Metaball {
                charge_pos: [-0.5, -1.0, 1.5],
                strength: 0.5,
                material: metaballs::Material {
                    color: [0.0, 0.0, 0.0],
                    roughness: 2.23606,
                },
            },
            metaballs::Metaball {
                charge_pos: [0.5, -1.0, 2.5],
                strength: 0.5,
                material: metaballs::Material {
                    color: [0.0, 0.0, 0.0],
                    roughness: 2.23606,
                },
            },
            metaballs::Metaball {
                charge_pos: [0.5, -1.0, 1.5],
                strength: 0.5,
                material: metaballs::Material {
                    color: [0.0, 0.0, 0.0],
                    roughness: 2.23606,
                },
            },
        ],
        point_lights: vec![
            lights::PointLight {
                pos: [5.0, 6.0, 0.0],
                color: [1.0, 1.0, 1.0],
                intensity: 0.004,
            }
        ],
    };

    let vert_shader_src = std::fs::read_to_string("./res/shaders/main.vert").expect("Could not read vertex shader src");
    let mut frag_shader_src = std::fs::read_to_string("./res/shaders/main.frag").expect("Could not read fragment shader src");
    // "Macro" replacement
    frag_shader_src = frag_shader_src.replacen("<->n_metaballs!<->", program_uniforms.metaballs.len().to_string().as_str(), 1);
    frag_shader_src = frag_shader_src.replacen("<->n_point_lights!<->", program_uniforms.point_lights.len().to_string().as_str(), 1);

    let program = glium::Program::from_source(&display, vert_shader_src.as_str(), frag_shader_src.as_str(), None).unwrap();

    let start_time = std::time::Instant::now();

    event_loop.run(move |ev, _, control_flow |{
        use glium::Surface;

        program_uniforms.screen_width= display.get_framebuffer_dimensions().0;
        program_uniforms.screen_height= display.get_framebuffer_dimensions().1;

        program_uniforms.metaballs[0].charge_pos[0] = (start_time.elapsed().as_secs_f32() * 1.2).sin() * 2.0;
        program_uniforms.metaballs[0].charge_pos[2] = (start_time.elapsed().as_secs_f32() * 1.2).cos()  + 2.0;

        program_uniforms.metaballs[1].charge_pos[1] = (start_time.elapsed().as_secs_f32() * 1.0).cos()/2.0;
        program_uniforms.metaballs[1].charge_pos[2] = (start_time.elapsed().as_secs_f32() * 1.0).sin()/2.0 + 2.0;

        let orbit_angle = start_time.elapsed().as_secs_f32()/2.0;
        let phi = orbit_angle - glm::half_pi::<f32>();
        let orbit_radius = 4.0;

        program_uniforms.camera_pos = glm::vec3(orbit_radius * phi.cos(), 1.0, orbit_radius* phi.sin()+2.0);
        program_uniforms.camera_rot_angle = -orbit_angle;

        let mut target = display.draw();
        target.clear_color(0.0, 0.0, 1.0, 1.0);
        target.draw(&canvas_buffer, &indicies, &program, &program_uniforms, &Default::default()).unwrap();
        target.finish().unwrap();

        let next_frame_time = std::time::Instant::now() + std::time::Duration::from_nanos(16_666_667);
        *control_flow = glutin::event_loop::ControlFlow::WaitUntil(next_frame_time);
        match ev {
            glutin::event::Event::WindowEvent {event, ..} => match event {
                glutin::event::WindowEvent::CloseRequested => {
                    *control_flow = glutin::event_loop::ControlFlow::Exit;
                    return;
                },
                _ => return,
            },
            _ => return,
        }

    });
}
