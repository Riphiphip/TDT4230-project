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


float getMaxSafeStep(float fieldStrength){
    return sqrt(sqrt(abs(maxCharge/fieldStrength)));
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
    uint remainingBounces;
};

Ray getCameraRay(vec3 planePoint, mat4 camMat, uint maxBounces){
    Ray camRay;
    vec4 planePointWS = camMat * vec4(planePoint, 1.0);
    vec4 cameraPointWS = camMat * vec4(vec3(0.0), 1.0);
    vec3 rayDir = normalize(vec3(planePointWS - cameraPointWS));

    camRay.orig = vec3(cameraPointWS);
    camRay.dir = rayDir;
    camRay.length = 0.0;
    camRay.remainingBounces = maxBounces;
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
        vec3 point = ray.orig + ray.dir * ray.length;
        if (getFieldStrength(point) >= threshold){
            return false;
        }
        ray.length += shadowRayStepSize;
    }
    return true;
}

uniform float ambientCoef = 0.05;
uniform float diffuseCoef = 1.0;

const float la = 0.0001;
const float lb = 0.0001;
const float lc = 0.0001;

const float specularCoef = 0.5;

float getShininess(Material material){
     return 5/(pow(material.roughness, 2));
}

//Calculate local illumination using Phong model.
vec3 getLocalIllumination(vec3 point, PointProperties pointProps, vec3 viewPoint){

    vec3 cameraPos = viewPoint;
    vec3 viewDir = normalize(vec3(cameraPos)-point);

    vec3 color = pointProps.material.color * ambientCoef;

    for (int i =0; i < nPointLights; ++i){
        PointLight light = pointLights[i];
        vec3 lightDir = normalize(light.pos - point);
        float distToLight = length(light.pos - point);
        // Check if point is in shadow
        Ray shadowRay;
        shadowRay.dir = lightDir;
        shadowRay.orig = point;
        shadowRay.length = shadowRayStepSize*2.0;
        float rejectFactor = float(castShadowRay(shadowRay));

        float attenuation = 1.0/(la + lb * distToLight + lc * pow(distToLight, 2));
        float commonCoef = rejectFactor * attenuation * light.intensity;

        // Diffuse
        color += commonCoef * max(0.0, dot(pointProps.normal, lightDir)) * pointProps.material.color;
        // Specular
        vec3 refLD = reflect(-lightDir, pointProps.normal);
        float shininess = getShininess(pointProps.material);
        color += commonCoef * pow(max(dot(viewDir, refLD), 0.0), shininess) * light.color * specularCoef;
    }
    return color;
}


// For texture mapping spheres
const vec2 invAtan = vec2(0.1591, 0.3183);
vec2 getSphereUV(vec3 normal)
{
    vec2 uv = vec2(atan(normal.z, normal.x), asin(normal.y));
    uv *= invAtan;
    uv += 0.5;
    return uv;
}

uniform sampler2D bgTex;
uniform float bgRayStepSize = 0.2;
uniform float skySphereRad = 20.0;

vec3 getBackground(Ray ray){
    vec3 rayEnd = ray.orig + ray.dir*ray.length;
    while (length(rayEnd) < skySphereRad){
        ray.length += bgRayStepSize;
        rayEnd = ray.orig + ray.dir*ray.length;
    }
    vec3 normal = normalize(rayEnd);
    vec2 uv = getSphereUV(normal);

    return vec3(texture2D(bgTex, uv));
}

uniform float rayStepSize = 0.008;
uniform uint maxSteps = 1000;

vec3 castRay(Ray ray) {
    vec3 color = vec3(0.0);
    Ray workingRay = ray;

    float contribCoef = 1.0;

    while (workingRay.remainingBounces > 0){

        vec3 point;
        float fieldStrength;
        bool didHit = false;

        int rayStep = 0;
        while ((rayStep < maxSteps) && !didHit){
            point = workingRay.orig + workingRay.dir * workingRay.length;
            fieldStrength = getFieldStrength(point);
            if (fieldStrength >= threshold){
                didHit = true;
                break; //TODO: may be unstable
            }
            float stepSize = max(getMaxSafeStep(fieldStrength), rayStepSize);
            workingRay.length += rayStepSize;
            rayStep++;
        }
        if (!didHit){
            color += getBackground(workingRay) * contribCoef;
            contribCoef = 0.0;
        } else {
            PointProperties pointProps = getPointProperties(point, fieldStrength);
            float shininess = getShininess(pointProps.material);

            color += getLocalIllumination(point, pointProps, workingRay.orig) * contribCoef;

            contribCoef *= shininess;

            workingRay.dir = normalize(reflect(workingRay.dir, pointProps.normal));
            workingRay.orig = point;
            workingRay.length = rayStepSize*2.0;
        }
            workingRay.remainingBounces -= 1;

    }

    return color;
}

layout(location = 0) in vec2 uv_in;
out vec4 color;

void main() {
    float aspectRatio = float(screenWidth)/float(screenHeight);

    vec2 uv = uv_in;
    uv.x *= aspectRatio;
    
    float xPerPix = aspectRatio / float(screenWidth);
    float yPerPix = 1.0 / float(screenHeight);

    vec3 colSum = vec3(0.0);
    uint sampleGridDim = 2;
    for (int x = 0; x < sampleGridDim; ++x){
        for (int y = 0; y < sampleGridDim; ++y){
            vec2 tmpUV = uv + vec2(x * xPerPix, y * yPerPix);
            Ray camRay = getCameraRay(vec3(tmpUV, imgPlaneZ), cameraMat, 4);
            colSum += castRay(camRay);
        }
    } 
    colSum /= (sampleGridDim*sampleGridDim);

    color = vec4(colSum, 1.0);
}