#version 430 core

layout(std140) uniform;

uniform uint screenWidth;
uniform uint screenHeight;

// z coordinate of the image plane relative to the camera
uniform float imgPlaneZ;
// Matrix for transforming camera location and camera ray directions
uniform mat4 cameraMat;

struct Material {
    vec3 color;
    float roughness;
};

struct Metaball {
    vec3 chargePos;
    float strength;
    Material material;
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

struct PointProperties {
    float fieldStrength;
    vec3 normal;
    Material material;
};

PointProperties getPointProperties(vec3 point, float fieldStrength) {
    PointProperties props;
    props.fieldStrength = fieldStrength;
    vec3 tmpNormal = vec3(0.0);

    props.material.color = vec3(0.0);
    props.material.roughness = 0.0;

    for(uint i= 0; i < nMetaballs; ++i){
        float contribution = metaballFalloff(metaballs[i], point)/fieldStrength;
        tmpNormal += normalize(point - metaballs[i].chargePos) * contribution;
        props.material.color += vec3(metaballs[i].material.color) * contribution;
        props.material.roughness += metaballs[i].material.roughness * contribution;
    }
    props.normal = normalize(tmpNormal);
    return props;
};

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

struct PointLight {
    vec3 pos;
    vec3 color;
    float intensity;
};

const int nPointLights= <->n_point_lights!<->; 
uniform PointLight pointLights[nPointLights];

uniform float shadowRayStepSize = 0.1;
uniform uint shadowRayMaxSteps = 100;

bool castShadowRay(Ray ray){
    for(int i = 0; i < shadowRayMaxSteps; ++i){
        vec3 testPoint = ray.orig + ray.dir * ray.length;
        if (getFieldStrength(testPoint) >= threshold){
            return false;
        }
        ray.length += shadowRayStepSize;
    }
    return true;
}

uniform vec3 ambientLight = vec3(1.0);
uniform float ambientCoef = 0.1;
uniform float diffuseCoef = 1.0;

const float la = 0.0001;
const float lb = 0.0001;
const float lc = 0.0001;

const int shininess = 8;
const float specularCoef = 0.5;

//Calculate local illumination using Phong model.
vec3 getLocalIllumination(vec3 point, float fieldStrength){

    vec4 cameraPos = cameraMat * vec4(vec3(0.0), 1.0);
    vec3 viewDir = normalize(vec3(cameraPos)-point);

    PointProperties pointProps = getPointProperties(point, fieldStrength);

    vec3 color = ambientLight * ambientCoef;

    for (int i =0; i < nPointLights; ++i){
        PointLight light = pointLights[i];
        vec3 lightDir = normalize(light.pos - point);
        // Check if point is in shadow
        Ray shadowRay;
        shadowRay.dir = lightDir;
        shadowRay.orig = point;
        shadowRay.length = shadowRayStepSize;
        float rejectFactor = float(castShadowRay(shadowRay));

        // Diffuse
        color += rejectFactor * max(0.0, dot(pointProps.normal, lightDir)) * pointProps.material.color;
        // Specular
        vec3 refLD = reflect(-lightDir, pointProps.normal);
        float shininess = 5/(pow(pointProps.material.roughness, 2));
        color += rejectFactor * pow(max(dot(viewDir, refLD), 0.0), shininess) * light.color * specularCoef;
    }
    return color;
}

uniform float rayStepSize = 0.01;
uniform uint maxSteps = 300;


layout(location = 0) in vec2 uv_in;
out vec4 color;

void main() {
    vec2 uv = uv_in;
    
    Ray camRay = getCameraRay(vec3(uv, imgPlaneZ), cameraMat);

    vec3 tmpColor = vec3(0.5, 0.5, 1.0);
    uint i = 0;
    while (i < maxSteps){
        vec3 testPoint = camRay.orig + camRay.dir * camRay.length;
        float fieldStrength = getFieldStrength(testPoint);
        if (fieldStrength >= threshold){
            tmpColor = getLocalIllumination(testPoint,fieldStrength);
            i = maxSteps;
        }
        camRay.length += rayStepSize;
        i++;
    }

    color = vec4(tmpColor, 1.0);
}