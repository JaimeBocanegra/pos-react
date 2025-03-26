import {
    IAfterGuiAttachedParams,
    IDoesFilterPassParams,
  } from "@ag-grid-community/core";
  import { CustomFilterProps, useGridFilter } from "@ag-grid-community/react";
  import React, { ChangeEvent, useCallback, useEffect, useState } from "react";
  
  export const CustomFilter = ({
    model,
    onModelChange,
    getValue,
    options,
  }: CustomFilterProps & { options: string[] }) => {
    const [closeFilter, setCloseFilter] = useState<(() => void) | undefined>();
    const [unappliedModel, setUnappliedModel] = useState(model);
  
    const doesFilterPass = useCallback(
        (params: IDoesFilterPassParams) => {
            const { node } = params; 
            const filterText: string = model;
            const value: string = getValue(node).toString().toLowerCase();
            console.log(value);
            // make sure each word passes separately, ie search for firstname, lastname
            return filterText
                .toLowerCase()
                .split(' ')
                .every((filterWord) => value.indexOf(filterWord) >= 0);
        },
        [model]
      );
  
    const afterGuiAttached = useCallback(
      ({ hidePopup }: IAfterGuiAttachedParams) => {
        setCloseFilter(() => hidePopup);
      },
      []
    );
  
    // register filter handlers with the grid
    useGridFilter({
      doesFilterPass,
      afterGuiAttached,
    });
  
    useEffect(() => {
      setUnappliedModel(model);
      console.log(model);
    }, [model]);
  
    const onYearChange = ({
      target: { value },
    }: ChangeEvent<HTMLSelectElement>) => {
      setUnappliedModel(value === "All" ? null : value);
    };
  
    const onClick = () => {
        if (unappliedModel !== undefined) {
          onModelChange(unappliedModel);
        } else {
          onModelChange(null); // Si no hay filtro seleccionado, limpia el filtro
        }
      
        if (closeFilter) {
          closeFilter();
        }
      };
  
    return (
      <div className="year-filter">
        <div>Select Year Range</div>
        <select onChange={({ target: { value } }) => onModelChange(value === '' ? null : value)} value={unappliedModel || ""}>
          <option value="All">--Select--</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button onClick={onClick}>Apply</button>
      </div>
    );
  };
  