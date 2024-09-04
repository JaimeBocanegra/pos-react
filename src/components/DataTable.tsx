import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Flex } from "@mantine/core";

interface DataTableProps {
  rowData: any[];
  columnDefs: any[];
  onGridReady: (params: any) => void;
  rowsPerPage: number;
  pagination: boolean;
}
const localeText = {
  // Traducciones para la interfaz de usuario de ag-Grid
  page: "Página",
  more: "Más",
  to: "a",
  of: "de",
  next: "Siguiente",
  last: "Último",
  first: "Primero",
  previous: "Anterior",
  loadingOoo: "Cargando...",
  selectAll: "Seleccionar todo",
  searchOoo: "Buscando...",
  blanks: "Vacíos",
  filterOoo: "Filtrando...",
  applyFilter: "Aplicar filtro",
  equals: "Igual a",
  notEqual: "No igual a",
  lessThan: "Menor que",
  greaterThan: "Mayor que",
  contains: "Contiene",
  notContains: "No contiene",
  startsWith: "Empieza con",
  endsWith: "Termina con",
  blank: "Vacio",
  notBlank: "No vacío",
  andCondition: "Y",
  orCondition: "O",
  resetFilter: "Restablecer filtro",
  clearFilter: "Limpiar filtro",
  cancelFilter: "Cancelar filtro",
  // columns tool panel
  noRowsToShow: "No hay filas para mostrar",
  // Date Filter
  dateFormatOoo: "dd/mm/yyyy",
  inRange: "En rango",
  inRangeStart: "desde",
  inRangeEnd: "hasta",
  lessThanOrEqual: "Menor o igual a",
  greaterThanOrEqual: "Mayor o igual a",
  empty: "Elige una",
  before: "Antes de",
  after: "Despues de",
};

const DataTable: React.FC<DataTableProps> = ({
  rowData,
  columnDefs,
  onGridReady,
  rowsPerPage,
  pagination,
}) => {
  return (
    <Flex pb="10px" px="10px">
      <div
        className="ag-theme-quartz"
        style={{ height: "100%", width: "100%", paddingBottom: "15px" }}
        id="myGrid"
      >
        <AgGridReact
          onGridReady={onGridReady}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            filter: true,
            sortable: true,
            resizable: false,
          }}
          domLayout="autoHeight"
          pagination={pagination}
          localeText={localeText}
          paginationPageSize={rowsPerPage}
          paginationPageSizeSelector={false}
        />
      </div>
    </Flex>
  );
};

export default DataTable;
