const lcjs = require('@lightningchart/lcjs')
const { AxisScrollStrategies, emptyFill, lightningChart, isImageFill, SolidFill, ColorRGBA, Themes } = lcjs

const exampleContainer = document.getElementById('chart') || document.body
if (exampleContainer === document.body) {
    exampleContainer.style.width = '100vw'
    exampleContainer.style.height = 'max(100vh, 100%)'
    exampleContainer.style.margin = '0px'
}
exampleContainer.style.overflowX = 'hidden'

const lc = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })

const windowsContainer = exampleContainer
const windows = []
const createWindow = (type) => {
    const container = document.createElement('div')
    windowsContainer.append(container)
    switch (type) {
        case 'lightningchart': {
            const chart = lc
                .ChartXY({
                    container,
                    theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
                })
                .setCursorMode('show-nearest')
                .setTitleEffect(false)
                .setSeriesBackgroundEffect(false)
            chart.axisX.setScrollStrategy(AxisScrollStrategies.progressive).setDefaultInterval((state) => ({
                end: state.dataMax ?? 0,
                start: (state.dataMax ?? 0) - 10_000,
                stopAxisAfter: false,
            }))
            const series = chart
                .addPointLineAreaSeries({ dataPattern: 'ProgressiveX' })
                .setMaxSampleCount(100_000)
                .setAreaFillStyle(emptyFill)
                .setStrokeStyle((stroke) => stroke.setThickness(1))
                .setEffect(false)
            windows.push({ type, container, chart, series })
            if (isImageFill(chart.engine.getBackgroundFillStyle())) {
                chart.engine.setBackgroundFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
            }
            break
        }
        case 'other':
        default: {
            const canvas = document.createElement('canvas')
            container.append(canvas)
            canvas.style.width = '100%'
            canvas.style.height = '100%'
            const ctx = canvas.getContext('2d')

            ctx.fillStyle = 'blue'
            ctx.fillRect(50, 50, 100, 100)

            ctx.beginPath()
            ctx.arc(250, 100, 50, 0, Math.PI * 2)
            ctx.fillStyle = 'red'
            ctx.fill()
            ctx.closePath()

            ctx.beginPath()
            ctx.moveTo(25, 100)
            ctx.lineTo(225, 100)
            ctx.strokeStyle = 'green'
            ctx.lineWidth = 5
            ctx.stroke()
            ctx.closePath()

            windows.push({ type: 'other', container })
            break
        }
    }
    container.style.position = 'absolute'
    container.style.boxSizing = 'content-box'
    container.style.width = `${windowsContainer.getBoundingClientRect().width / 4}px`
    container.style.left = `${(windows.length % 4) * (windowsContainer.getBoundingClientRect().width / 4)}px`
    container.style.height = '200px'
    container.style.top = `${Math.floor(windows.length / 4) * 200}px`
    container.addEventListener('pointerdown', (eventDown) => {
        if (eventDown.defaultPrevented) return

        container.style.pointerEvents = 'none'
        windows.forEach((window) => window.type === 'lightningchart' && window.chart.setCursorMode(undefined))
        // Lift window to top draw order by placing it as last DOM child
        windowsContainer.append(container)

        let prevEvent = eventDown
        const handleMove = (eventMove) => {
            const delta = {
                x: eventMove.clientX - prevEvent.clientX,
                y: eventMove.clientY - prevEvent.clientY,
            }
            container.style.left = `${Number.parseFloat(container.style.left.replace('px', '')) + delta.x}px`
            container.style.top = `${Number.parseFloat(container.style.top.replace('px', '')) + delta.y}px`
            prevEvent = eventMove
        }
        const handleUp = (eventUp) => {
            container.style.pointerEvents = 'unset'
            windows.forEach((window) => window.type === 'lightningchart' && window.chart.setCursorMode('show-nearest'))
            window.removeEventListener('pointermove', handleMove)
            window.removeEventListener('pointerup', handleUp)
        }
        window.addEventListener('pointermove', handleMove)
        window.addEventListener('pointerup', handleUp)
    })
    return windows[windows.length - 1]
}
for (let i = 0; i < 20; i += 1) {
    createWindow('lightningchart')
}
createWindow('other')

const isDarkTheme = windows.find((item) => item.type === 'lightningchart').chart.getTheme().isDark
windows.forEach((window) => {
    window.container.style.border = `solid 1px ${isDarkTheme ? 'white' : 'black'}`
    window.container.style.backgroundColor = isDarkTheme ? 'rgb(40,40,40)' : 'rgb(255,255,255)'
})

// Setup initial view for demo purposes
windows[windows.length - 2].container.style.left = '130px'
windows[windows.length - 2].container.style.top = '340px'
windows[windows.length - 1].container.style.left = '300px'
windows[windows.length - 1].container.style.top = '490px'
windows[6].container.style.left = '410px'
windows[6].container.style.top = '370px'
windowsContainer.append(windows[6].container)

// Demonstration random data stream. Approx 1 point every 16ms, total no more than ~60 data points per second.
setInterval(() => {
    const p = { x: performance.now(), y: Math.random() }
    windows.forEach((window) => {
        if (window.type !== 'lightningchart') return
        if (window.series) {
            window.series.appendSample(p)
        } else if (window.pointSeriesList) {
            const series = window.pointSeriesList[Math.round(Math.random() * (window.pointSeriesList.length - 1))]
            series.appendSample(p)
        }
    })
}, 1000 / 60)
