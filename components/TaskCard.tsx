// full contents of components/TaskCard.tsx

import React from 'react';
import { Todo, User, TodoStatus } from '../types';
import { Avatar } from './ui/Avatar';
import { PriorityDisplay } from './ui/PriorityDisplay';

interface TaskCardProps {
    todo: Todo;
    allTodos: Todo[];
    user: User;
    personnel: User[];
    isSelected: boolean;
    onSelectionChange: (id: string | number) => void;
    onDragStart?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ todo, allTodos, user, personnel, isSelected, onSelectionChange, onDragStart }) => {
    const assignee = React.useMemo(() => personnel.find(p => p.id === todo.assigneeId), [personnel, todo.assigneeId]);

    const isBlocked = React.useMemo(() => {
        if (!todo.dependsOn || todo.dependsOn.length === 0) return false;
        return todo.dependsOn.some(depId => {
            const dependency = allTodos.find(t => t.id == depId); // Use loose equality for mixed types
            return dependency && dependency.status !== TodoStatus.DONE;
        });
    }, [todo.dependsOn, allTodos]);

    const blockerTasks = React.useMemo(() => {
        if (!isBlocked || !todo.dependsOn) return '';
        return todo.dependsOn
            .map(depId => allTodos.find(t => t.id == depId)) // Use loose equality
            .filter((t): t is Todo => !!t && t.status !== TodoStatus.DONE)
            .map(t => `#${t.id} - ${t.text}`)
            .join('\n');
    }, [isBlocked, todo.dependsOn, allTodos]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!isBlocked) {
                onSelectionChange(todo.id);
            }
        }
    };
    
    return (
        <div
            draggable={!isBlocked}
            onDragStart={!isBlocked ? onDragStart : undefined}
            onClick={!isBlocked ? () => onSelectionChange(todo.id) : undefined}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            aria-disabled={isBlocked}
            className={`bg-white dark:bg-slate-900 p-3 rounded-md border-l-4 shadow-sm transition-all ${
                isSelected ? 'ring-2 ring-sky-500' : 'hover:shadow-md'
            } ${isBlocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ borderColor: todo.priority === 'High' ? '#ef4444' : todo.priority === 'Medium' ? '#f59e0b' : '#3b82f6' }}
        >
            <div className="flex justify-between items-start">
                <p className="font-medium text-sm text-slate-800 dark:text-slate-100 pr-2">{todo.text}</p>
                <div className="flex items-center flex-shrink-0">
                    {isBlocked && (
                        <div className="mr-2 text-slate-400" title={`Blocked by:\n${blockerTasks}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={!isBlocked ? () => onSelectionChange(todo.id) : undefined}
                        disabled={isBlocked}
                        className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                </div>
            </div>
            <div className="flex justify-between items-center mt-3">
                <PriorityDisplay priority={todo.priority} />
                {assignee && <Avatar name={assignee.name} imageUrl={assignee.avatarUrl} className="w-6 h-6 text-xs" />}
            </div>
        </div>
    );
};