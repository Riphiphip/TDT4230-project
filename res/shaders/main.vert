#version 430 core

in vec2 position;

layout(location = 0) out vec2 uv;

void main() {
    uv = position;
    gl_Position = vec4(position, 0.0, 1.0);
}
