# Teams App Icons
#
# Place the following files in this directory:
#   color.png   – 192×192 px full-color app icon (used in Teams app store and header)
#   outline.png – 32×32 px white/transparent outline icon (used in Teams sidebar)
#
# Requirements:
#   - color.png must be exactly 192x192 px, PNG format
#   - outline.png must be exactly 32x32 px, PNG format, white foreground + transparent background
#   - No rounded corners (Teams applies them automatically)
#
# Quick generation using ImageMagick:
#   magick -size 192x192 xc:#5C2D91 -fill white -gravity center -font Arial -pointsize 72 -annotate +0+0 "MM" color.png
#   magick -size 32x32 xc:none -fill white -gravity center -font Arial -pointsize 18 -annotate +0+0 "M" outline.png
