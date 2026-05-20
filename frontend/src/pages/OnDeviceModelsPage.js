import React from 'react';
import CrudPage from '../components/CrudPage';
import { on_device_modelsApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'size_gb', label: 'Size (GB)', type: 'number' },
  { key: 'quantization', label: 'Quant', type: 'select', options: ["Q4_K_M","Q5_K_M","Q6_K","Q8_0","F16"] },
  { key: 'status', label: 'Status', type: 'select', options: ["loaded","available","downloading"] },
  { key: 'last_used', label: 'Last Used', type: 'datetime-local' }
];

export default function OnDeviceModelsPage() {
  return (
    <CrudPage
      title="On-Device Models"
      subtitle="Manage on-device models records"
      api={on_device_modelsApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
