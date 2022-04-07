# TDT4230 Final project: Spaghetti code and metaballs

![](report_cover.png)

## Introduction
The goal of the project was to implement 3D rendering of reflective metaballs using some form of ray-casting.

Metaballs are form of isosurface that can be used to create "blobby" objects with the ability to smoothly merge together. They are a quite old technique in the world of 3D graphics, being invented in the early 1980s, but can still be used to create interesting effects. They can be modeled as a set of charges that contribute to a field, with their effect falling off as you get further away. If several metaballs are present, the charge at a given point is equal to the sum of the contributions of all the metaballs in the scene. If the charge at a given point is above a specified threshold the point is considered to be inside the metaball. If not, it is outside. The boundary between these regions forms our desired isosurface. A surface like this can not be rendered using the standard OpenGL rendering pipeline without some preprocessing, since OpenGL expects a triangulated mesh. This could be solved by employing an algorithm like marching cubes to generate said mesh, or by sidestepping most of the rendering pipeline and running a raycasting algorithm in the fragment shader alone. Doing raycasting would also allow for some additional effects like reflection and/or refraction to be implemented without causing too much trouble. I decided to go for this and keep it simple by only adding reflection.

A showcase of my results can be seen in [this youtube playlist](https://www.youtube.com/watch?v=FTZO-PiJcuc&list=PLjJiCycrwvGgZjM8QSqeH8_vhboGP_qiR). Note that the quality of the renders will be decreased due to youtube compressing the video. Check out [my github repo](https://github.com/Riphiphip/TDT4230-project) for more high-res videos and the source code of the project.

## Implementation
To do raytracing in OpenGL I started by creating a canvas of two triangles forming a rectangle covering the entire screen. The fragment shader can then do all of the actual rendering by casting the rays, calculating intersections, determining material properties, sending reflected rays etc. To reduce noise four rays are cast per pixel and the average of their colors is used to determine the color of the pixel.

The raytracing itself is roughly explained by the pseudocode below
```glsl
Color castRay(cameraRay){
    Color color = RGB(0.0, 0.0, 0.0); // Starting color
    Ray ray = cameraRay;

    while ray.remainingBounces > 0
    {
        for i in 0..maxRaySteps 
        {
            ray.length += stepSize;
            if fieldStrength at rayEnd >= threshold // Hit!
            {
                color += localIllumination * contributionFactor;
                ray = reflectedRay;

                updateContributionFactor();
            } 
            else // Miss!
            { 
                color += getBackground(ray) * contributionFactor;
            }
        }
        ray.remainingBounces -= 1;
    }

    return color;
}
```
A coarser raycasting was used to determine wether an object is in shadow, and to determine which part of the background texture should be sampled. Phong lighting was used to determine local illumination.

The project was written in rust, and interfaced with OpenGL through the [Glium](https://docs.rs/glium/latest/glium/) crate. This crate provides a safe rust wrapper on top of OpenGL that handles a lot of the messy details for you. It is however not that well documented beyond the basics, and more complex functionality tends to be quite well hidden beyond several layers of abstraction. I chose to use this interface because I had no intention of doing anything complex outside of the shaders, wanted something up and running quickly, and to make it easy to maintain and modify.

There were several issues that had to be solved to achieve the desired results. The main one was figuring out how to properly assign a normal and material properties to a given surface point. I did not find any litterature on this, although I'll admit that my search was quite shallow. I decided to go for a weighted average where the contributions of each metaball was equivalent to their relative contribution to the charge. This method seemed to work fine for most properties, but sometimes cause strange artifacts. This can be seen in [this example](https://www.youtube.com/watch?v=7QPTZ5GRDX8&list=PLjJiCycrwvGgZjM8QSqeH8_vhboGP_qiR&index=2). As the shiny blobs start moving away from their source black bands can be seen between the blobs. These fade as the blobs get more spread out. I suspect that this is caused by the normals being distored by the large mass of metaballs at the origin causing the reflected ray to move in the wrong direction, but these artifacts were not noticed until quite late in the project so I did not have the time to verify this or attempt to find a solution. 

The other main problem I encountered was performance. The code does not even approach running in real time, with each frame taking approximately a second to render, and outputing the frame to an image taking about two seconds. The time increases for more complex scenes. Some reading on the topic has led me to believe that the rendering could be improved by performing the rendering in a compute shader which outputs to a texture that is then drawn on a canvas. I looked into implementing this, but I didn't figure out how I could have done this using Glium. Had I realised sooner I would probably have switched over to C++ instead, but at the point where perfomance really started to tank I more or less had a functional implementation. Since running real-time was not a part of the original goal I decided that it was more important to get my results looking good than having them be fast, which is why I am providing pre-rendered videos.

## Running the code
**NB!:** My laptop continously crashed when attempting to render the scenes. To be fair it has at most an integrated GPU and is running a somewhat unstable set of drivers across the board.

To run the code ensure that you have a proper rust setup and run
```bash
cargo run
```
This should build the executable and start rendering the frames of the scene defined by `main.rs`. Use a tool like `ffmpeg` to convert these into a video. 

## Sources
- Generic stuff about raytracing online 
- Doing stuff until it looked ok
- The previous assignment on Phong lighting
  - Used for local illumination
- Some papers on metaballs that I ended up not using
  - Should probably have paid some more attention to increase performance for complex scenes