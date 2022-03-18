#version 430 core

layout(std140) uniform;

uniform uint screenWidth;
uniform uint screenHeight;

// z coordinate of the image plane relative to the camera
uniform float imgPlaneZ;
// Matrix for transforming camera location and camera ray directions
uniform mat4 cameraMat;

uniform float rayStepSize = 0.01;
uniform uint maxSteps = 300;

struct Metaball {
    vec3 chargePos;
    float strength;
    vec4 color;
};

// Custom "macro". Will be replaced before compilation. 
// Would have used an equivalent to -D if it was available.
const int nMetaballs = <->n_metaballs!<->; 
uniform Metaball metaballs[nMetaballs];
uniform float threshold;
uniform float maxCharge;

float metaballFalloff(Metaball metaball, vec3 point){
    float dist = length(point-metaball.chargePos);
    return metaball.strength * pow(1.0/pow(dist,2.0),2.0);
}

float getFieldStrength(vec3 point){
    float strength = 0.0;
    for (int i = 0; i < nMetaballs; i++){
        strength += metaballFalloff(metaballs[i], point);
    }
    return strength;
}

vec3 getNormal(vec3 point){
    vec3 normal = vec3(0.0);
    for(uint i= 0; i < nMetaballs; ++i){
        normal += normalize(point - metaballs[i].chargePos) * metaballFalloff(metaballs[i], point);
    }
    return normalize(normal);
}

struct Ray {
    vec3 orig;
    vec3 dir;
    float length;
};

Ray getCameraRay(vec3 planePoint, mat4 camMat){
    Ray camRay;
    vec4 planePointWS = camMat * vec4(planePoint, 1.0);
    vec4 cameraPointWS = camMat * vec4(vec3(0.0), 1.0);
    vec3 rayDir = normalize(vec3(planePointWS - cameraPointWS));

    camRay.orig = vec3(cameraPointWS);
    camRay.dir = rayDir;
    camRay.length = 0.0;
    return camRay;
}

layout(location = 0) in vec2 uv_in;
out vec4 color;

void main() {
    vec2 uv = uv_in;
    
    Ray camRay = getCameraRay(vec3(uv, imgPlaneZ), cameraMat);

    vec3 tmpColor = vec3(0.5, 0.5, 1.0);
    uint i = 0;
    while (i < maxSteps){
        vec3 testPoint = camRay.orig + camRay.dir * camRay.length;
        if (getFieldStrength(testPoint) >= threshold){
            vec3 normal = getNormal(testPoint);
            tmpColor = normal/2.0 + vec3(.5);
            i = maxSteps;
        }
        camRay.length += rayStepSize;
        i++;
    }

    color = vec4(tmpColor, 1.0);
}