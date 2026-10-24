'use client';

import { useState } from 'react';
import { AudioMappingPanel } from './audio-mapping-panel';
import { ThemePanel } from './theme-panel';

type CustomizationTab = 'mapping' | 'theme';

export function CustomizationPanels() {
  const [activeTab, setActiveTab] = useState<CustomizationTab>('mapping');
  return (
    <>
      <div className="inspector-tabs" role="tablist" aria-label="Customization panel sections">
        <button aria-controls="customization-panel" aria-selected={activeTab === 'mapping'} className={'inspector-tab' + (activeTab === 'mapping' ? ' inspector-tab--active' : '')} id="customization-tab-mapping" onClick={() => setActiveTab('mapping')} role="tab" type="button">Mapping</button>
        <button aria-controls="customization-panel" aria-selected={activeTab === 'theme'} className={'inspector-tab' + (activeTab === 'theme' ? ' inspector-tab--active' : '')} id="customization-tab-theme" onClick={() => setActiveTab('theme')} role="tab" type="button">Theme</button>
        <button className="inspector-tab inspector-tab--disabled" disabled title="Effects controls are planned for the next increment" type="button">Effects</button>
        <button className="inspector-tab inspector-tab--disabled" disabled title="Audio controls are already available in the audio workbench" type="button">Audio</button>
      </div>
      <div aria-labelledby={activeTab === 'mapping' ? 'customization-tab-mapping' : 'customization-tab-theme'} id="customization-panel" role="tabpanel">
        {activeTab === 'mapping' ? <AudioMappingPanel /> : <ThemePanel />}
      </div>
    </>
  );
}
