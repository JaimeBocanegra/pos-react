'use client'

import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { MultiSelect } from '@mantine/core';

interface CustomMultiFilterProps {
  colDef: {
    field: string;
  };
  options: string[];
  filterChangedCallback?: () => void;
}

const CustomMultiFilter = forwardRef((p: CustomMultiFilterProps, ref) => {
  const { field } = p.colDef;
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [containerHeight, setContainerHeight] = useState(80);
  const filterRef = useRef<HTMLDivElement>(null);

  const options = p.options.map((option: string) => ({ value: option, label: option }));

  useEffect(() => {
    // Only call if the callback exists
    p.filterChangedCallback?.();
  }, [selectedValues]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (filterRef.current) {
      const inputElement = filterRef.current.querySelector('div');
      if (inputElement) {
        const divpillsheight = inputElement.offsetHeight;
        const baseHeight = divpillsheight === 0 ? 70 : divpillsheight + 30;
        const additionalHeight = isOpen ? 80 : 0;
        setContainerHeight(baseHeight + additionalHeight);
      }
    }
  }, [isOpen, selectedValues]);

  useImperativeHandle(ref, () => ({
    isFilterActive: () => {
      return selectedValues.length > 0;
    },
    doesFilterPass: (params: any) => {
      if (selectedValues.length === 0) return true;
      return selectedValues.some(value => 
        params.data[field].toLowerCase().includes(value.toLowerCase())
      );
    },
    getModel: () => {
      return selectedValues.length > 0 ? { values: selectedValues } : null;
    },
    setModel: (model: any) => {
      setSelectedValues(model ? model.values : []);
    },
    resetFilter: () => {
      setSelectedValues([]);
    }
  }));

  return (
    <div 
      ref={filterRef}
      style={{ 
        padding: 6, 
        height: containerHeight,
        width: '200px', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'height 0.3s ease'
      }}
    >
      <MultiSelect
        label={`Filtro ${field}`}
        data={options}
        value={selectedValues}
        dropdownPosition="bottom"
        onChange={setSelectedValues}
        placeholder="Seleccionar valores"
        searchable
        maxDropdownHeight={85}
        clearable
        onDropdownClose={() => setIsOpen(false)}
        onDropdownOpen={() => setIsOpen(true)}
      />
    </div>
  );
});

export default CustomMultiFilter;