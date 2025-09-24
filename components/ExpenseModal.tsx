import React, { useState } from 'react';
import { User } from '../types';

const CUSTOM_CATEGORY_VALUE = '__custom__';

interface ExpenseModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ user, onClose, onSuccess, addToast }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Mock expense creation
      addToast('Expense created successfully', 'success');
      onSuccess();
    } catch (error) {
      addToast('Failed to create expense', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select category</option>
              <option value="materials">Materials</option>
              <option value="labor">Labor</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 border rounded">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseModal;
