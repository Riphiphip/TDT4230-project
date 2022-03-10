
extern crate glium;

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

    let vert_shader_src = std::fs::read_to_string("./res/shaders/main.vert").expect("Could not read vertex shader src");
    let frag_shader_src = std::fs::read_to_string("./res/shaders/main.frag").expect("Could not read fragment shader src");
    let program = glium::Program::from_source(&display, vert_shader_src.as_str(), frag_shader_src.as_str(), None).unwrap();


    event_loop.run(move |ev, _, control_flow |{
        use glium::Surface;

        let mut target = display.draw();
        target.clear_color(0.0, 0.0, 1.0, 1.0);
        target.draw(&canvas_buffer, &indicies, &program, &glium::uniforms::EmptyUniforms, &Default::default()).unwrap();
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
