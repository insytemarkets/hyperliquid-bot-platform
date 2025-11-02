import React, { useState, useRef, useCallback } from 'react';
import StrategyNode, { StrategyNodeData } from './StrategyNode';

interface Connection {
  id: string;
  from: { nodeId: string; output: number };
  to: { nodeId: string; input: number };
}

interface StrategyCanvasProps {
  nodes: StrategyNodeData[];
  connections: Connection[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeAdd: (nodeType: string, position: { x: number; y: number }) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<StrategyNodeData>) => void;
  onNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  onConnectionAdd: (connection: Omit<Connection, 'id'>) => void;
  onClearAll: () => void;
  onValidate: () => void;
}

const StrategyCanvas: React.FC<StrategyCanvasProps> = ({
  nodes,
  connections,
  selectedNodeId,
  onNodeSelect,
  onNodeAdd,
  onNodeUpdate,
  onNodeMove,
  onConnectionAdd,
  onClearAll,
  onValidate
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const nodeElement = e.currentTarget as HTMLElement;
    const nodeRect = nodeElement.getBoundingClientRect();
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setDragOffset({
      x: e.clientX - nodeRect.left,
      y: e.clientY - nodeRect.top
    });
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !draggedNodeId || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left - dragOffset.x;
    const y = e.clientY - canvasRect.top - dragOffset.y;

    const boundedX = Math.max(0, Math.min(x, canvasRect.width - 200));
    const boundedY = Math.max(0, Math.min(y, canvasRect.height - 150));

    onNodeMove(draggedNodeId, { x: boundedX, y: boundedY });
  }, [isDragging, draggedNodeId, dragOffset, onNodeMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const nodeType = e.dataTransfer.getData('text/plain');
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    onNodeAdd(nodeType, { x, y });
  }, [onNodeAdd]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const renderConnections = () => {
    return connections.map(connection => {
      const fromNode = nodes.find(n => n.id === connection.from.nodeId);
      const toNode = nodes.find(n => n.id === connection.to.nodeId);
      
      if (!fromNode || !toNode) return null;

      // Calculate connection points (simplified)
      const fromX = fromNode.position.x + 200; // Node width
      const fromY = fromNode.position.y + 75; // Approximate center
      const toX = toNode.position.x;
      const toY = toNode.position.y + 75;

      const midX = (fromX + toX) / 2;

      return (
        <path
          key={connection.id}
          className="connection-line"
          d={`M ${fromX} ${fromY} Q ${midX} ${fromY} ${toX} ${toY}`}
        />
      );
    });
  };

  return (
    <div className="card rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Strategy Flow</h3>
        <div className="flex space-x-2">
          <button 
            className="btn-secondary px-3 py-1 rounded text-sm"
            onClick={onClearAll}
          >
            Clear All
          </button>
          <button className="btn-secondary px-3 py-1 rounded text-sm">
            Auto Layout
          </button>
          <button 
            className="btn-primary px-3 py-1 rounded text-sm"
            onClick={onValidate}
          >
            Validate
          </button>
        </div>
      </div>
      
      <div
        ref={canvasRef}
        className="canvas-area border-2 border-dashed border-gray-300 rounded-lg p-4 relative"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{ minHeight: '600px' }}
      >
        {/* SVG for connections */}
        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
          {renderConnections()}
        </svg>

        {/* Strategy Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            style={{ position: 'absolute' }}
          >
            <StrategyNode
              node={node}
              isSelected={selectedNodeId === node.id}
              onSelect={onNodeSelect}
              onParameterChange={(nodeId, parameter, value) => {
                const updatedParameters = { ...node.parameters, [parameter]: value };
                onNodeUpdate(nodeId, { parameters: updatedParameters });
              }}
              onPositionChange={onNodeMove}
            />
          </div>
        ))}

        {/* Drop zone hint */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <p>Drag components from the sidebar to build your strategy</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyCanvas;




