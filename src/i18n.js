export const strings = {
  en: {
    card_name: 'Automower incident heatmap',
    card_description: 'Heatmap of mower errors, located with GPS history and refreshed automatically.',
    frame_title: 'Mower incident heatmap',
    loading: 'Loading history…',
    entity_missing: 'Entity not found: {id}. Edit the card configuration.',
    refresh_failed: 'Refresh failed.',
    refresh_failed_kept: 'Refresh failed, last map kept.',
    refresh_hint: 'Check the connection and the history permissions.',
    invalid_mower: 'Select a lawn_mower entity.',
    invalid_entity: 'Invalid entity: {key}',
    invalid_range: '{key} must be between {min} and {max}.',
    invalid_filter: 'Invalid error filter.',
    invalid_map: 'Invalid map type.',
    invalid_types: 'error_types must be a list of codes.',
    invalid_boolean: 'Boolean value required: {key}',
    no_located: 'No incident with a reliable GPS position over this period.',
    no_match: 'No incident matches the configuration.',
    map_error: 'Map error: {message}',
    end: 'End: {date}',
    not_observed: 'not observed',
    sector: 'Sector {zone} · {count} incidents',
    section_mower: 'Mower',
    mower: 'Mower',
    error_sensor: 'Error sensor',
    gps: 'GPS position',
    select_entity: 'Select a {domain} entity',
    select_available: '{title}: select an available entity.',
    sensors_hint: 'Sensors are suggested from the mower. Correct them if their names differ.',
    section_errors: 'Errors to display',
    error_selection: 'Error selection',
    filter_terrain: 'Terrain-related errors',
    filter_all: 'All errors',
    filter_custom: 'Choose error types',
    search: 'Search a code or label',
    search_label: 'Search an error',
    custom_hint: 'The filter applies to the first code of each incident. No type checked = no incident displayed.',
    section_history: 'History and refresh',
    days: 'History (days)',
    refresh: 'Refresh (seconds)',
    section_map: 'Map',
    map_type: 'Base map',
    satellite: 'Satellite',
    plan: 'OpenStreetMap',
    height: 'Height (pixels)',
    zoom: 'Maximum initial zoom',
    heat_radius: 'Heat radius (pixels)',
    heat_blur: 'Blur (pixels)',
    show_points: 'Show incident points',
    show_zones: 'Show numbered sectors',
  },
  fr: {
    card_name: 'Automower : heatmap des incidents',
    card_description: 'Carte des erreurs de la tondeuse, localisées par l’historique GPS et rafraîchies automatiquement.',
    frame_title: 'Heatmap des incidents de la tondeuse',
    loading: 'Chargement de l’historique…',
    entity_missing: 'Entité introuvable : {id}. Modifier la configuration de la carte.',
    refresh_failed: 'Échec du rafraîchissement.',
    refresh_failed_kept: 'Échec du rafraîchissement : dernière carte conservée.',
    refresh_hint: 'Vérifier la connexion et les droits sur l’historique.',
    invalid_mower: 'Sélectionner une entité lawn_mower.',
    invalid_entity: 'Entité invalide : {key}',
    invalid_range: '{key} doit être compris entre {min} et {max}.',
    invalid_filter: 'Filtre d’erreurs invalide.',
    invalid_map: 'Fond de carte invalide.',
    invalid_types: 'error_types doit être une liste de codes.',
    invalid_boolean: 'Valeur booléenne requise : {key}',
    no_located: 'Aucun incident avec position GPS fiable sur cette période.',
    no_match: 'Aucun incident correspondant à la configuration.',
    map_error: 'Erreur carte : {message}',
    end: 'Fin : {date}',
    not_observed: 'non observée',
    sector: 'Secteur {zone} · {count} incidents',
    section_mower: 'Tondeuse',
    mower: 'Tondeuse',
    error_sensor: 'Capteur des erreurs',
    gps: 'Position GPS',
    select_entity: 'Sélectionner une entité {domain}',
    select_available: '{title} : sélectionner une entité disponible.',
    sensors_hint: 'Les capteurs sont proposés à partir de la tondeuse. Ils peuvent être corrigés si leurs noms diffèrent.',
    section_errors: 'Erreurs à afficher',
    error_selection: 'Sélection des erreurs',
    filter_terrain: 'Erreurs liées au terrain',
    filter_all: 'Toutes les erreurs',
    filter_custom: 'Choisir les types d’erreur',
    search: 'Rechercher un code ou un libellé',
    search_label: 'Rechercher une erreur',
    custom_hint: 'Le filtre porte sur le code initial de chaque incident. Aucun type coché = aucun incident affiché.',
    section_history: 'Historique et rafraîchissement',
    days: 'Historique (jours)',
    refresh: 'Rafraîchissement (secondes)',
    section_map: 'Cartographie',
    map_type: 'Fond de carte',
    satellite: 'Satellite',
    plan: 'OpenStreetMap',
    height: 'Hauteur (pixels)',
    zoom: 'Zoom initial maximal',
    heat_radius: 'Rayon de chaleur (pixels)',
    heat_blur: 'Lissage (pixels)',
    show_points: 'Afficher les points des incidents',
    show_zones: 'Afficher les secteurs numérotés',
  },
};

// Home Assistant sets <html lang> to the user language, which covers setConfig() before hass is known.
export function language(hass) {
  const raw = hass?.locale?.language || hass?.language || globalThis.document?.documentElement?.lang || globalThis.navigator?.language || 'en';
  const short = String(raw).toLowerCase().split('-')[0];
  return strings[short] ? short : 'en';
}

export function translator(lang = 'en') {
  const table = strings[lang] || strings.en;
  return (key, params = {}) => (table[key] ?? strings.en[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}

export const humanize = code => {
  const text = String(code).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Home Assistant translates enum sensor states (all Automower error codes) in the user language.
export function errorLabel(hass, stateObj, code) {
  if (stateObj && typeof hass?.formatEntityState === 'function') {
    try {
      const label = hass.formatEntityState(stateObj, code);
      if (label && label !== code) return label;
    } catch { /* fall back to the raw code */ }
  }
  return humanize(code);
}
