import React, { useState } from 'react';
import { Todo, User } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface KanbanBoardProps {
  todos: Todo[];
  allTodos: Todo[];
  user: User;
  personnel: User[];
  onTaskStatusChange: (taskId: string, newStatus: Todo['status']) => void;
  onTaskSelectionChange?: (taskIds: string[]) => void;
  selectedTaskIds?: string[];
}

const statusColumns = [
  { id: 'pending', title: 'Pending', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100 border-blue-300' },
  { id: 'completed', title: 'Completed', color: 'bg-green-100 border-green-300' }
] as const;

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  todos, 
  allTodos, 
  user, 
  personnel, 
  onTaskStatusChange, 
  onTaskSelectionChange, 
  selectedTaskIds 
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | number | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newStatus: Todo['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && draggedTaskId) {
      onTaskStatusChange(taskId, newStatus);
    }
    setDraggedTaskId(null);
  };

  const getTasksByStatus = (status: Todo['status']) => {
    return todos.filter(todo => todo.status === status);
  };

  const handleTaskClick = (taskId: string) => {
    if (!onTaskSelectionChange || !selectedTaskIds) return;
    
    const isSelected = selectedTaskIds.includes(taskId);
    if (isSelected) {
      onTaskSelectionChange(selectedTaskIds.filter(id => id !== taskId));
    } else {
      onTaskSelectionChange([...selectedTaskIds, taskId]);
    }
  };

  const getAssigneeInfo = (assigneeId: string) => {
    return personnel.find(p => p.id === assigneeId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {statusColumns.map((column) => {
        const tasks = getTasksByStatus(column.id as Todo['status']);
        
        return (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{column.title}</h3>
              <span className="px-2 py-1 bg-gray-200 rounded-full text-sm font-medium">
                {tasks.length}
              </span>
            </div>
            
            <div
              className={`min-h-96 p-4 rounded-lg border-2 border-dashed ${column.color} transition-colors`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id as Todo['status'])}
            >
              <div className="space-y-3">
                {tasks.map((task) => {
                  const assignee = getAssigneeInfo(task.assignedTo);
                  const isSelected = selectedTaskIds?.includes(task.id) || false;
                  
                  return (
                    <Card
                      key={task.id}
                      className={`cursor-move transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      } ${draggedTaskId === task.id ? 'opacity-50' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <div className="p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-2">
                            {assignee && (
                              <span>👤 {assignee.firstName} {assignee.lastName}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {task.priority}
                            </span>
                            
                            {task.dueDate && (
                              <span className="text-gray-500">
                                📅 {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                
                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p>Drop tasks here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
