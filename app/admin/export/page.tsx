// app/admin/export/page.tsx

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

'use client';

import { useState, useMemo } from 'react';
import { BOT_EXPORT_FIELDS, type BotExportField } from '@/lib/ura-game-types';

type FieldsState = {
  [K in BotExportField]: boolean;
};

const createInitialFieldsState = (): FieldsState => {
  return BOT_EXPORT_FIELDS.reduce((acc, field) => {
    acc[field] = false;
    return acc;
  }, {} as FieldsState);
};

export default function AdminExport() {
    const [fields, setFields] = useState<FieldsState>(createInitialFieldsState());
    const [isLoading, setIsLoading] = useState(false);

    const selectedFields = useMemo(() => {
        return Object.entries(fields)
            .filter(([, isSelected]) => isSelected)
            .map(([field]) => field);
    }, [fields]);

    const handleFieldChange = (field: BotExportField) => {
        setFields(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSelectAll = () => {
        const allSelected = BOT_EXPORT_FIELDS.every(field => fields[field]);
        setFields(
            BOT_EXPORT_FIELDS.reduce((acc, field) => {
                acc[field] = !allSelected;
                return acc;
            }, {} as FieldsState)
        );
    };

    const handleExport = async () => {
        if (selectedFields.length === 0) {
            alert('Please select at least one field to export');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fields: selectedFields }),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `user-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Export User Data</h1>
            
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Select Fields to Export</h2>
                    <button
                        onClick={handleSelectAll}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                        {BOT_EXPORT_FIELDS.every(field => fields[field]) ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {BOT_EXPORT_FIELDS.map((field) => (
                        <label key={field} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={fields[field]}
                                onChange={() => handleFieldChange(field)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </label>
                    ))}
                </div>

                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={isLoading || selectedFields.length === 0}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Exporting...' : 'Export CSV'}
                    </button>
                </div>
            </div>
        </div>
    );
}
