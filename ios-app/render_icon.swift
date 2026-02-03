import AppKit
import Foundation

let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)

image.lockFocus()

// Dark background with subtle gradient
let bgGradient = NSGradient(colors: [
    NSColor(red: 0.04, green: 0.04, blue: 0.04, alpha: 1.0),
    NSColor(red: 0.08, green: 0.12, blue: 0.16, alpha: 1.0)
])
bgGradient?.draw(in: NSRect(origin: .zero, size: size), angle: 135)

let context = NSGraphicsContext.current?.cgContext

// Outer glow
let outerGlow = NSGradient(colors: [
    NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.3),
    NSColor.clear
])
let glowRect = NSRect(x: 162, y: 162, width: 700, height: 700)
context?.saveGState()
let glowPath = NSBezierPath(ovalIn: glowRect)
glowPath.addClip()
outerGlow?.draw(from: NSPoint(x: 512, y: 512), to: NSPoint(x: 162, y: 162), options: .drawsBeforeStartingLocation)
context?.restoreGState()

// Inner glow
let innerGlow = NSGradient(colors: [
    NSColor(red: 0.06, green: 0.69, blue: 0.51, alpha: 0.2),
    NSColor.clear
])
let innerGlowRect = NSRect(x: 262, y: 262, width: 500, height: 500)
context?.saveGState()
let innerPath = NSBezierPath(ovalIn: innerGlowRect)
innerPath.addClip()
innerGlow?.draw(from: NSPoint(x: 532, y: 532), to: NSPoint(x: 262, y: 262), options: .drawsBeforeStartingLocation)
context?.restoreGState()

// Brain profile silhouette (simplified head profile with brain pattern)
context?.setLineWidth(32)
context?.setLineJoin(.round)
context?.setLineCap(.round)

// Gradient for brain
let brainGradient = NSGradient(colors: [
    NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 1.0),  // brandAccent
    NSColor(red: 0.06, green: 0.69, blue: 0.51, alpha: 1.0)   // success
])

// Head outline
let headPath = NSBezierPath()
headPath.move(to: NSPoint(x: 412, y: 712))
headPath.curve(to: NSPoint(x: 412, y: 312), controlPoint1: NSPoint(x: 312, y: 612), controlPoint2: NSPoint(x: 312, y: 412))
headPath.curve(to: NSPoint(x: 612, y: 312), controlPoint1: NSPoint(x: 412, y: 212), controlPoint2: NSPoint(x: 512, y: 212))
headPath.curve(to: NSPoint(x: 712, y: 512), controlPoint1: NSPoint(x: 712, y: 312), controlPoint2: NSPoint(x: 762, y: 412))
headPath.curve(to: NSPoint(x: 612, y: 712), controlPoint1: NSPoint(x: 712, y: 612), controlPoint2: NSPoint(x: 662, y: 712))
headPath.line(to: NSPoint(x: 412, y: 712))

context?.saveGState()
headPath.addClip()
brainGradient?.draw(from: NSPoint(x: 412, y: 712), to: NSPoint(x: 612, y: 312), options: [])
context?.restoreGState()

context?.setStrokeColor(NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 1.0).cgColor)
headPath.stroke()

// Brain folds inside
context?.setLineWidth(16)
let fold1 = NSBezierPath()
fold1.move(to: NSPoint(x: 462, y: 412))
fold1.curve(to: NSPoint(x: 532, y: 462), controlPoint1: NSPoint(x: 482, y: 432), controlPoint2: NSPoint(x: 512, y: 452))
fold1.stroke()

let fold2 = NSBezierPath()
fold2.move(to: NSPoint(x: 482, y: 512))
fold2.curve(to: NSPoint(x: 582, y: 532), controlPoint1: NSPoint(x: 512, y: 522), controlPoint2: NSPoint(x: 552, y: 532))
fold2.stroke()

// Sparkles
let sparklePositions: [(CGFloat, CGFloat)] = [
    (312, 412), (782, 362), (362, 662), (732, 612),
    (412, 262), (662, 262), (262, 512), (812, 512)
]

for (i, pos) in sparklePositions.enumerated() {
    let sparkle = NSBezierPath()
    let cx = pos.0
    let cy = pos.1
    let size: CGFloat = i % 2 == 0 ? 24 : 16
    
    // Four-point star
    sparkle.move(to: NSPoint(x: cx, y: cy + size))
    sparkle.line(to: NSPoint(x: cx, y: cy - size))
    sparkle.move(to: NSPoint(x: cx + size, y: cy))
    sparkle.line(to: NSPoint(x: cx - size, y: cy))
    
    context?.setStrokeColor(i % 2 == 0 ? NSColor(red: 1.0, green: 0.8, blue: 0.2, alpha: 0.8).cgColor : NSColor(red: 0.23, green: 0.51, blue: 0.96, alpha: 0.7).cgColor)
    context?.setLineWidth(4)
    sparkle.stroke()
}

image.unlockFocus()

// Save
if let tiffData = image.tiffRepresentation,
   let bitmap = NSBitmapImageRep(data: tiffData),
   let pngData = bitmap.representation(using: .png, properties: [:]) {
    try? pngData.write(to: URL(fileURLWithPath: "LifeLog/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"))
}

print("✅ App icon rendered")
