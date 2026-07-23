// PDF → 페이지별 PNG 추출 (macOS 내장 PDFKit, 의존성 없음)
// 사용: swift pdf-to-png.swift <pdf_path> <out_dir> [scale=2.0]
// 결과: out_dir/page_01.png ~ page_NN.png

import Foundation
import PDFKit
import AppKit

guard CommandLine.arguments.count >= 3 else {
    print("usage: swift pdf-to-png.swift <pdf_path> <out_dir> [scale]")
    exit(2)
}

let pdfPath = CommandLine.arguments[1]
let outDir = CommandLine.arguments[2]
let scale: CGFloat = CommandLine.arguments.count >= 4 ? CGFloat(Double(CommandLine.arguments[3]) ?? 2.0) : 2.0

let pdfURL = URL(fileURLWithPath: pdfPath)
guard let doc = PDFDocument(url: pdfURL) else {
    FileHandle.standardError.write("Failed to open PDF\n".data(using: .utf8)!)
    exit(1)
}

try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let bounds = page.bounds(for: .mediaBox)
    let pixelWidth = Int(bounds.width * scale)
    let pixelHeight = Int(bounds.height * scale)

    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: pixelWidth,
        pixelsHigh: pixelHeight,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else { continue }

    rep.size = NSSize(width: bounds.width, height: bounds.height)
    NSGraphicsContext.saveGraphicsState()
    let ctx = NSGraphicsContext(bitmapImageRep: rep)!
    NSGraphicsContext.current = ctx
    let cgCtx = ctx.cgContext
    cgCtx.saveGState()
    cgCtx.setFillColor(NSColor.white.cgColor)
    cgCtx.fill(CGRect(x: 0, y: 0, width: bounds.width, height: bounds.height))
    page.draw(with: .mediaBox, to: cgCtx)
    cgCtx.restoreGState()
    NSGraphicsContext.restoreGraphicsState()

    guard let data = rep.representation(using: .png, properties: [:]) else { continue }
    let outURL = URL(fileURLWithPath: outDir).appendingPathComponent(String(format: "page_%02d.png", i + 1))
    do {
        try data.write(to: outURL)
        print("page \(i + 1) -> \(outURL.path) (\(pixelWidth)x\(pixelHeight))")
    } catch {
        FileHandle.standardError.write("write fail page \(i + 1): \(error)\n".data(using: .utf8)!)
    }
}

print("done. pages: \(doc.pageCount)")
