#version 430 core

struct MetaBall {
    vec3 chargePos;
    float strength;
    vec4 color;
}

const int nMetaBalls = 1;
uniform Metaball metaBalls[nMetaBalls];
uniform float threshold = 0.5;

float metaballFalloff(Metaball metaball, vec3 point){
    float dist = length(point-metaball.pos);
    return pow(1.0/pow(dist,2.0),2.0);
}

float fieldStrength(vec3 point){
    float output = 0.0;
    for (int i = 0; i < nMetaBalls; i++){
        output += metaballFalloff(metaBalls[i], point);
    }
    return output;
}

uniform float time;


out vec4 color;

void main() {
    color = vec4(1.0, 0.0, 0.0, 1.0);
}