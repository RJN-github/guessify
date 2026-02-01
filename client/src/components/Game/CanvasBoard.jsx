import React, {useRef, useEffect, useState, useCallback} from 'react'
import socket from '../../socket/socket'
import '../../css/CanvasBoard.css'

function CanvasBoard({isDrawer}) {
    const canvasRef = useRef(null)
    const ContextRef = useRef(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [strokes, setStrokes] = useState([])
    const [currentStroke, setCurrentStroke] = useState([])
    const strokeBufferRef = useRef([])
    const lastPointRef = useRef()
    const startPointRef = useRef()
    const strokeColorRef = useRef('#ffffff')
    const [strokeColor, setStrokeColor] = useState('#ffffff')
    const colorButtons = ['White', 'Black', 'Red', 'Green', 'Blue']
    const colorBtnRef = useRef(null)

    // Global color state - sabke drawing strokes ka current color
    const globalColorRef = useRef('#ffffff')

    useEffect(() => {
        const canvas = canvasRef.current
        canvas.width = 800
        canvas.height = 500
        canvas.style.border = '2px solid #9b5de5'

        const ctx = canvas.getContext('2d')
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = strokeColorRef.current
        ctx.lineWidth = 3
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        ContextRef.current = ctx

        console.log(strokes, currentStroke)
        socket.on('room:DrawStrokes', DrawCanvas)
        socket.on('room:CanvasCleared', clearLocalCanvas)
        socket.on('room:interPolationPoints', handleInterPolation)

        return () => {
            socket.off('room:DrawStrokes', DrawCanvas)
            socket.off('room:CanvasCleared', clearLocalCanvas)
            socket.off('room:interPolationPoints', handleInterPolation)
        }
    }, [])

    // Color change socket listener - Real-time color sync
    useEffect(() => {
        socket.on('room:strokeColor', (colorData) => {
            console.log('Color received from server:', colorData)

            // Update global color for all ongoing strokes
            const newColor = getColorValue(colorData.colorName)
            globalColorRef.current = newColor
            strokeColorRef.current = newColor
            setStrokeColor(newColor)

            // Update canvas context color
            if (ContextRef.current) {
                ContextRef.current.strokeStyle = newColor
            }
        })

        return () => {
            socket.off('room:strokeColor')
        }
    }, [])

    const getColorValue = (colorName) => {
        switch (colorName) {
            case 'White': return '#ffffff'
            case 'Black': return '#000000'
            case 'Red': return '#ff0000'
            case 'Green': return '#00ff00'
            case 'Blue': return '#0000ff'
            default: return '#ffffff'
        }
    }

    const DrawCanvas = useCallback((receivedStrokes) => {
        if (!Array.isArray(receivedStrokes) || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d')
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        let isFirstPoint = true
        ctx.beginPath()

        receivedStrokes.forEach((point) => {
            // Use global color for all incoming strokes - ye ensure karta hai ki sabke strokes same color mein dikhe
            ctx.strokeStyle = globalColorRef.current

            if (point.type === 'start' || isFirstPoint) {
                ctx.beginPath()
                ctx.moveTo(point.x, point.y)
                isFirstPoint = false
            } else if (point.type === 'move') {
                ctx.lineTo(point.x, point.y)
                ctx.stroke()
            }
        })
    }, [])

    const getMouseCoordinates = useCallback((e) => {
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()

        const borderWidth = 2
        const x = e.clientX - rect.left - borderWidth
        const y = e.clientY - rect.top - borderWidth

        return {
            x: Math.max(0, Math.min(x, canvas.width)),
            y: Math.max(0, Math.min(y, canvas.height))
        }
    }, [])

    const throttledEmit = useCallback((() => {
        let timeout = null
        return () => {
            if (timeout) return

            timeout = setTimeout(() => {
                if (strokeBufferRef.current.length > 0) {
                    socket.emit("Drawing", [...strokeBufferRef.current])
                    lastPointRef.current = strokeBufferRef.current[strokeBufferRef.current.length - 1]
                    startPointRef.current = strokeBufferRef.current[0]
                    strokeBufferRef.current = []
                }
                timeout = null
            }, 33)
        }
    })(), [])

    const interPolatePoints = useCallback((p1, p2) => {
        if (!p1 || !p2) return
        const ctx = canvasRef.current.getContext('2d')
        const spacing = 1
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const steps = Math.floor(distance / spacing)

        // Use current global color for interpolation
        ctx.strokeStyle = globalColorRef.current
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        for (let i = 1; i <= steps; i++) {
            const x = p1.x + (dx * i) / steps
            const y = p1.y + (dy * i) / steps
            ctx.lineTo(x, y)
        }
        ctx.stroke()
    }, [])

    const handleMouseDown = useCallback((e) => {
        // Only drawer can draw
        if (!isDrawer) {
            alert("Only the drawer can draw!");
            return;
        }

        const {x, y} = getMouseCoordinates(e)

        // Use current global color
        ContextRef.current.strokeStyle = globalColorRef.current
        ContextRef.current.beginPath()
        ContextRef.current.moveTo(x, y)
        setIsDrawing(true)

        const startPoint = {x, y, type: 'start', color: globalColorRef.current}

        strokeBufferRef.current = [startPoint]
        setCurrentStroke([startPoint])
        setStrokes(prev => [...prev, startPoint])

        socket.emit("Drawing", [startPoint])
    }, [getMouseCoordinates, isDrawer])

    const handleMouseMove = useCallback((e) => {
        if (!isDrawing) return

        const {x, y} = getMouseCoordinates(e)

        // Use current global color for move points
        const movePoint = {x, y, type: 'move', color: globalColorRef.current}

        // Update canvas context color before drawing
        ContextRef.current.strokeStyle = globalColorRef.current
        ContextRef.current.lineTo(x, y)
        ContextRef.current.stroke()

        strokeBufferRef.current.push(movePoint)
        setCurrentStroke(prev => [...prev, movePoint])
        setStrokes(prev => [...prev, movePoint])

        throttledEmit()
    }, [isDrawing, getMouseCoordinates, throttledEmit])

    const handleMouseUp = useCallback(() => {
        if (!isDrawing) return
        ContextRef.current.closePath()
        setIsDrawing(false)

        if (strokeBufferRef.current.length > 0) {
            socket.emit("Drawing", [...strokeBufferRef.current])
            strokeBufferRef.current = []
        }

        const startPoint = startPointRef.current
        const lastPoint = lastPointRef.current

        interPolatePoints(startPoint, lastPoint);
        setCurrentStroke([])
    }, [isDrawing, interPolatePoints])

    const handleInterPolation = useCallback(({startpoint, lastpoint}) => {
        interPolatePoints(startpoint, lastpoint)
    }, [interPolatePoints])

    const clearLocalCanvas = useCallback(() => {
        const ctx = ContextRef.current
        if (ctx && canvasRef.current) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
        setStrokes([])
        setCurrentStroke([])
        strokeBufferRef.current = []
    }, [])

    const ClearCanvas = useCallback(() => {
        clearLocalCanvas()
        socket.emit("ClearCanvas")
    }, [clearLocalCanvas])

    const changeStrokeColor = (colorName) => {
        const newColor = getColorValue(colorName)

        // Update all color references
        globalColorRef.current = newColor
        strokeColorRef.current = newColor
        setStrokeColor(newColor)

        // Update canvas context
        if (ContextRef.current) {
            ContextRef.current.strokeStyle = newColor
        }

        // Emit color change with both color value and name
        socket.emit('room:setStrokeColor', {
            colorName: colorName,
            colorValue: newColor,
            userId: socket.id,
            timestamp: Date.now()
        })

        console.log('Color changed to:', colorName, newColor)
    }

    return (
        <>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                margin: '20px 0'
            }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                        background: '#151532',
                        borderRadius: '12px',
                        cursor: 'crosshair',
                        display: 'block',
                        userSelect: 'none',
                        touchAction: 'none'
                    }}
                />


<div className={'FontColorContainer'}>
                {colorButtons.map((item) => (
                    <button
                        key={item}
                        ref={colorBtnRef}
                        className={`FontColors ${item} ${strokeColor === getColorValue(item) ? 'active' : ''}`}
                        onClick={() => changeStrokeColor(item)}
                        style={{

                            transform: strokeColor === getColorValue(item) ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {}
                    </button>
                ))}
            </div>
            <button
                onClick={ClearCanvas}
                style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#9b5de5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                }}
            >
                Clear Canvas
            </button>
            </div>

           
        </>
    )
}

export default CanvasBoard