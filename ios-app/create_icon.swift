import AppKit
import Foundation

let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)

image.lockFocus()

// Background gradient (dark teal to blue)
let gradient = NSGradient(colors: [
    NSColor(red: 0.1, green: 0.3, blue: 0.4, alpha: 1.0),
    NSColor(red: 0.2, green: 0.5, blue: 0.7, alpha: 1.0)
])
gradient?.draw(in: NSRect(origin: .zero, size: size), angle: 135)

// Draw brain/network icon
let context = NSGraphicsContext.current?.cgContext
context?.setStrokeColor(NSColor.white.cgColor)
context?.setLineWidth(20)

// Simple brain outline
let brainPath = NSBezierPath()
brainPath.move(to: NSPoint(x: 512, y: 800))
brainPath.curve(to: NSPoint(x: 312, y: 512), 
                controlPoint1: NSPoint(x: 312, y: 700),
                controlPoint2: NSPoint(x: 212, y: 612))
brainPath.curve(to: NSPoint(x: 512, y: 224),
                controlPoint1: NSPoint(x: 212, y: 412),
                controlPoint2: NSPoint(x: 312, y: 324))
brainPath.curve(to: NSPoint(x: 712, y: 512),
                controlPoint1: NSPoint(x: 712, y: 324),
                controlPoint2: NSPoint(x: 812, y: 412))
brainPath.curve(to: NSPoint(x: 512, y: 800),
                controlPoint1: NSPoint(x: 812, y: 612),
                controlPoint2: NSPoint(x: 712, y: 700))

brainPath.stroke()

image.unlockFocus()

// Save as PNG
if let tiffData = image.tiffRepresentation,
   let bitmap = NSBitmapImageRep(data: tiffData),
   let pngData = bitmap.representation(using: .png, properties: [:]) {
    try? pngData.write(to: URL(fileURLWithPath: "app-icon-temp.png"))
}
