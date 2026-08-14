import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { WaterNetworkModel, HydraulicResults, WaterNode, WaterLink } from '../../../types/water';

interface NetworkCanvasProps {
  model: WaterNetworkModel;
  results?: HydraulicResults | null;
  selectedNodeId?: string | null;
  selectedLinkId?: string | null;
  onNodeClick?: (id: string) => void;
  onLinkClick?: (id: string) => void;
  onNodePositionChange?: (id: string, x: number, y: number) => void;
  width?: number;
  height?: number;
}

type NodeDatum = WaterNode & {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type LinkDatum = WaterLink & {
  source: string | NodeDatum;
  target: string | NodeDatum;
};

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  model,
  results,
  selectedNodeId,
  selectedLinkId,
  onNodeClick,
  onLinkClick,
  onNodePositionChange,
  width = 800,
  height = 600,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: React.ReactNode }>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });
  const [size, setSize] = useState<{ w: number; h: number }>({ w: width, h: height });

  // Track the container size so the canvas fills it (incl. full-screen toggle)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      if (cr.width > 0 && cr.height > 0) {
        setSize({ w: cr.width, h: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    const containerEl = containerRef.current;
    if (!svgEl || !containerEl) return;

    // Size the canvas to fill its container. The svg is absolutely positioned
    // inside the container (see JSX), so its size never inflates the layout.
    const cw = containerEl.clientWidth || size.w || width;
    const ch = containerEl.clientHeight || size.h || height;
    svgEl.setAttribute('width', String(cw));
    svgEl.setAttribute('height', String(ch));

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    if (!model.nodes || !model.links || model.nodes.length === 0) return;

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      // Allow small mouse movements during a click without swallowing it
      .clickDistance(4)
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Deep copy nodes and links for d3-force so we don't mutate original objects initially
    const nodes: NodeDatum[] = model.nodes.map(n => ({ ...n }));
    const links: LinkDatum[] = model.links.map(l => ({ ...l, source: l.startNode, target: l.endNode }));

    // Give any node without coordinates a position near the existing cluster,
    // so adding a node doesn't re-scatter the whole network.
    const positioned = nodes.filter(n => typeof n.x === 'number' && typeof n.y === 'number');
    if (positioned.length < nodes.length) {
      let spawnX: number;
      let spawnY: number;
      if (positioned.length > 0) {
        spawnX = positioned.reduce((s, n) => s + (n.x as number), 0) / positioned.length + 100;
        spawnY = positioned.reduce((s, n) => s + (n.y as number), 0) / positioned.length + 60;
      } else {
        spawnX = cw / 2;
        spawnY = ch / 2;
      }
      let placed = 0;
      nodes.forEach(n => {
        if (typeof n.x !== 'number' || typeof n.y !== 'number') {
          n.x = spawnX + (placed % 5) * 25;
          n.y = spawnY + Math.floor(placed / 5) * 25;
          placed++;
        }
      });
      // Persist generated coordinates back to the model
      nodes.forEach(n => {
        const origNode = model.nodes.find(mn => mn.id === n.id);
        if (origNode && (origNode.x !== n.x || origNode.y !== n.y)) {
          origNode.x = n.x;
          origNode.y = n.y;
        }
      });
    }

    // Node color scale based on pressure (Red: low, Blue: high)
    const minPressure = results?.minPressure ?? 0;
    const maxPressure = results?.maxPressure ?? 100;
    const nodeColorScale = d3.scaleSequential(d3.interpolateRdYlBu)
      .domain([minPressure, maxPressure]);

    // Link color scale based on velocity (Blue: low, Red: high)
    const maxVelocity = results?.maxVelocity ?? 5;
    const linkColorScale = d3.scaleSequential(d3.interpolateOrRd)
      .domain([0, maxVelocity]);

    // Marker for arrows
    svg.append("defs").selectAll("marker")
      .data(["arrow"])
      .enter().append("marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15) // offset for node radius
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666");

    // Track pointer-down position so we can distinguish a click from a pan drag.
    // d3-zoom calls preventDefault() on mouseup, which suppresses the browser's
    // click event on this SVG, so selection must be handled on pointerup instead.
    let downPos: { x: number; y: number } | null = null;

    const linkSelection = g.append('g')
      .selectAll('path')
      .data(links)
      .enter().append('path')
      .attr('stroke', d => {
        if (results?.links[d.id]) {
          return linkColorScale(results.links[d.id].velocity);
        }
        return '#999';
      })
      .attr('stroke-width', d => d.type === 'Pipe' ? 2 : 3)
      .attr('stroke-dasharray', d => d.type === 'Pipe' ? 'none' : '5,5')
      .attr('fill', 'none')
      .attr('marker-end', d => d.type === 'Pipe' ? 'url(#arrow)' : '')
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const linkRes = results?.links[d.id];
        setTooltip({
          visible: true,
          x: event.pageX + 10,
          y: event.pageY + 10,
          content: (
            <div>
              <strong>{d.type}: {d.id}</strong>
              {linkRes && (
                <>
                  <div>Flow: {linkRes.flow.toFixed(2)}</div>
                  <div>Velocity: {linkRes.velocity.toFixed(2)}</div>
                  <div>Headloss: {linkRes.headloss.toFixed(2)}</div>
                </>
              )}
            </div>
          ),
        });
      })
      .on('mouseout', () => setTooltip(prev => ({ ...prev, visible: false })))
      .on('pointerdown', (event, d) => {
        downPos = { x: event.clientX, y: event.clientY };
      })
      .on('pointerup', (event, d) => {
        if (downPos) {
          const moved = Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y);
          downPos = null;
          if (moved < 6 && onLinkClick) onLinkClick(d.id);
        }
      })
      .attr('class', d => d.id === selectedLinkId ? 'network-link selected' : 'network-link');

    const nodeSelection = g.append('g')
      .selectAll('g.node')
      .data(nodes)
      .enter().append('g')
      .attr('class', d => d.id === selectedNodeId ? 'network-node selected' : 'network-node')
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const nodeRes = results?.nodes[d.id];
        setTooltip({
          visible: true,
          x: event.pageX + 10,
          y: event.pageY + 10,
          content: (
            <div>
              <strong>{d.type}: {d.id}</strong>
              {nodeRes && (
                <>
                  <div>Demand: {nodeRes.demand.toFixed(2)}</div>
                  <div>Head: {nodeRes.head.toFixed(2)}</div>
                  <div>Pressure: {nodeRes.pressure.toFixed(2)}</div>
                </>
              )}
            </div>
          ),
        });
      })
      .on('mouseout', () => setTooltip(prev => ({ ...prev, visible: false })))
      .on('pointerdown', (event, d) => {
        downPos = { x: event.clientX, y: event.clientY };
      })
      .on('pointerup', (event, d) => {
        if (downPos) {
          const moved = Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y);
          downPos = null;
          if (moved < 6 && onNodeClick) onNodeClick(d.id);
        }
      });

    // Draw shapes based on node type
    nodeSelection.each(function(d) {
      const sel = d3.select(this);
      const fill = results?.nodes[d.id] ? nodeColorScale(results.nodes[d.id].pressure) : '#ccc';

      // Invisible enlarged hit target so clicks near the node (or on its label)
      // land on the node instead of falling through to the canvas
      sel.append('circle')
        .attr('r', 18)
        .attr('fill', 'transparent')
        .attr('stroke', 'none')
        .attr('class', 'network-node-hit')
        .style('pointer-events', 'all');

      if (d.type === 'Junction') {
        sel.append('circle')
          .attr('r', 6)
          .attr('fill', fill)
          .attr('stroke', '#333')
          .attr('stroke-width', 1.5);
      } else if (d.type === 'Reservoir') {
        sel.append('polygon')
          .attr('points', '0,-10 10,10 -10,10') // Triangle
          .attr('fill', fill)
          .attr('stroke', '#333')
          .attr('stroke-width', 1.5);
      } else if (d.type === 'Tank') {
        sel.append('rect')
          .attr('x', -8)
          .attr('y', -8)
          .attr('width', 16)
          .attr('height', 16) // Square / cylinder rep
          .attr('fill', fill)
          .attr('stroke', '#333')
          .attr('stroke-width', 1.5);
      }

      // Add label (clickable so the whole node area is an easy target)
      sel.append('text')
        .text(d.id)
        .attr('dx', 12)
        .attr('dy', 4)
        .style('font-size', '10px')
        .style('font-family', 'Inter, sans-serif')
        .style('fill', 'var(--text-primary)')
        .style('pointer-events', 'all');
    });

    // Draw links with absolute coordinates
    linkSelection.attr('d', (d: any) => {
      const sourceNode = nodes.find(n => n.id === d.startNode);
      const targetNode = nodes.find(n => n.id === d.endNode);
      if (sourceNode && targetNode) {
        d.source = sourceNode;
        d.target = targetNode;
        return `M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`;
      }
      return '';
    });
    nodeSelection.attr('transform', d => `translate(${d.x},${d.y})`);

    // Auto-fit the view on first load or when the network bounds change
    if (nodes.length > 0) {
      const xs = nodes.map(n => n.x as number);
      const ys = nodes.map(n => n.y as number);
      const xExtent = d3.extent(xs) as [number, number];
      const yExtent = d3.extent(ys) as [number, number];

      const dx = (xExtent[1] - xExtent[0]) || 1;
      const dy = (yExtent[1] - yExtent[0]) || 1;
      const x = (xExtent[0] + xExtent[1]) / 2;
      const y = (yExtent[0] + yExtent[1]) / 2;
      const scale = Math.max(0.1, Math.min(2, 0.9 / Math.max(dx / cw, dy / ch)));
      const translate = [cw / 2 - scale * x, ch / 2 - scale * y];

      // Only apply the fit if the user hasn't manually zoomed/panned yet,
      // so the view doesn't snap back while dragging
      const currentTransform = d3.zoomTransform(svgEl as Element);
      if (currentTransform.k === 1 && currentTransform.x === 0 && currentTransform.y === 0) {
        svg.call(zoom.transform as any, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      }
    }

    const drag = d3.drag<SVGGElement, NodeDatum>()
      .on('drag', (event, d) => {
        d.x = event.x;
        d.y = event.y;
        nodeSelection.attr('transform', (nd) => `translate(${nd.x},${nd.y})`);
        linkSelection.attr('d', (l: any) => {
          if (l.source && l.target) {
            return `M${l.source.x},${l.source.y} L${l.target.x},${l.target.y}`;
          }
          return '';
        });
      })
      .on('end', (event, d) => {
        if (onNodePositionChange) {
          onNodePositionChange(d.id, d.x!, d.y!);
        }
      });
    
    nodeSelection.call(drag as any);  }, [model, results, width, height, size, onNodeClick, onLinkClick, onNodePositionChange]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{`
        .network-node:hover circle:not(.network-node-hit), .network-node:hover rect, .network-node:hover polygon {
          fill: #f59e0b !important;
          cursor: pointer;
        }
        .network-link:hover {
          stroke: #f59e0b !important;
          stroke-width: 6px !important;
          cursor: pointer;
        }
        .network-node.selected circle, .network-node.selected rect, .network-node.selected polygon {
          stroke: #f59e0b !important;
          stroke-width: 4px !important;
        }
        .network-link.selected {
          stroke: #f59e0b !important;
          stroke-dasharray: 5,5;
          stroke-width: 4px !important;
        }
      `}</style>
      <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#f8f9fa' }} />
      {tooltip.visible && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: tooltip.y,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          padding: '8px',
          borderRadius: '4px',
          pointerEvents: 'none',
          fontSize: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};
