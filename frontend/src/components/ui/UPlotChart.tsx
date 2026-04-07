import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

/**
 * Props for the UPlotChart component.
 */
interface UPlotChartProps {
    /** [x-values, y-values] data array. Expected to be synchronized in length. */
    data: [number[], number[]];
    /** Width of the chart in pixels. */
    width?: number;
    /** Height of the chart in pixels. */
    height?: number;
    /** Primary stroke color for the live trace. */
    color?: string;
    /** Toggle for rendering a secondary reference (golden) trace. */
    showGolden?: boolean;
    /** Reference data for comparison. */
    goldenData?: [number[], number[]];
}

/**
 * UPlotChart: A high-performance RF trace visualization component.
 * 
 * Unlike traditional SVG-based charting libraries (like Recharts), 
 * this component uses uPlot and the HTML5 Canvas API to render
 * thousands of points per second without performance degradation.
 * 
 * It is specifically optimized for live RF telemetry streaming from 
 * VNAs and Spectrum Analyzers.
 */
export const UPlotChart: React.FC<UPlotChartProps> = ({ 
    data, 
    width = 600, 
    height = 400, 
    color = '#1E6FD9',
    showGolden = false,
    goldenData
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const uplotInst = useRef<uPlot | null>(null);

    /**
     * Initializes the uPlot instance on mount.
     * Configures axes, grid, and series styles.
     */
    useEffect(() => {
        if (!chartRef.current) return;

        const opts: uPlot.Options = {
            width,
            height,
            axes: [
                {
                    stroke: "rgba(255,255,255,0.4)",
                    grid: { stroke: "rgba(255,255,255,0.03)", width: 1 },
                    values: (_u, vals) => vals.map(v => v.toFixed(2) + "G")
                },
                {
                    stroke: "rgba(255,255,255,0.4)",
                    grid: { stroke: "rgba(255,255,255,0.03)", width: 1 },
                    values: (_u, vals) => vals.map(v => v.toFixed(1) + "dB")
                }
            ],
            series: [
                {}, // x-axis mapping
                {
                    label: "Live Trace",
                    stroke: color,
                    width: 2,
                    fill: "rgba(30,111,217,0.1)"
                },
                ...(showGolden ? [{
                    label: "Golden",
                    stroke: "rgba(255,255,255,0.2)",
                    width: 1,
                    dash: [5, 5]
                }] : [])
            ]
        };

        const chartData = showGolden && goldenData 
            ? [data[0], data[1], goldenData[1]] 
            : data;

        // Create the canvas context and begin the render loop
        uplotInst.current = new uPlot(opts, chartData as uPlot.AlignedData, chartRef.current);

        return () => {
            uplotInst.current?.destroy();
        };
    }, []); // Run once on component mount

    /**
     * Data Update Hook:
     * Efficiently pushes new data buffers to the existing canvas without re-mounting.
     */
    useEffect(() => {
        if (uplotInst.current) {
            const chartData = showGolden && goldenData 
                ? [data[0], data[1], goldenData[1]] 
                : data;
            
            // Only update if arrays have data to prevent empty canvas flicker
            if (data[0] && data[0].length > 0) {
                 uplotInst.current.setData(chartData as uPlot.AlignedData);
            }
        }
    }, [data, showGolden, goldenData]);

    return <div ref={chartRef} className="w-full h-full overflow-hidden" />;
};
