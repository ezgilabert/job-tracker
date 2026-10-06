// ============================================================
// i18n: translations + apply helpers
// ============================================================

export const SUPPORTED_LANGS = [
  { id: 'es', label: 'Español',  flag: '🇦🇷', hint: 'Interfaz en español' },
  { id: 'en', label: 'English',  flag: '🇬🇧', hint: 'Interface in English' },
];

const translations = {
  // ============================================================
  // ESPAÑOL
  // ============================================================
  es: {
    // Header
    'app.name': 'Job Tracker',
    'app.subtitle': 'Tu búsqueda laboral, organizada',
    'app.documentTitle': 'Job Tracker · Mi búsqueda laboral',
    'action.config': 'Configuración',
    'action.theme': 'Cambiar tema',

    // Stats
    'stats.total': 'Total',
    'stats.active': 'Activas',
    'stats.inProcess': 'En proceso',
    'stats.offers': 'Ofertas',
    'stats.closed': 'Cerradas',

    // Form
    'form.title': '✨ Nueva postulación',
    'form.subtitle': 'Cargá una nueva oportunidad',
    'form.toggle': 'Mostrar/ocultar',
    'form.empresa': 'Empresa',
    'form.empresa.placeholder': 'Ej: Google',
    'form.puesto': 'Puesto',
    'form.puesto.placeholder': 'Elegí o escribí un rol',
    'form.fecha': 'Fecha',
    'form.estado': 'Estado inicial',
    'form.link': 'Link de la oferta',
    'form.salario': 'Rango salarial',
    'form.salario.placeholder': 'Ej: USD 3.000–4.000/mes, ARS 2.000.000–2.500.000 o USD 20–30/h',
    'form.salarioPorHora': 'Es por hora',
    'form.contacto': 'Contacto',
    'form.contacto.placeholder': 'Ej: María López (Recruiter)',
    'form.notas': 'Notas',
    'form.notas.placeholder': 'Contacto, próxima instancia, referidos...',
    'form.submit': 'Agregar postulación',

    // Jobs
    'jobs.title': '📋 Postulaciones',
    'jobs.subtitle': 'Tu historial de procesos',

    // Referrals
    'refs.title': '🤝 Referidos',
    'refs.subtitle': 'Tu red de contactos que pueden recomendarte',
    'refs.new': '➕ Nuevo referido',
    'refs.nombre': 'Nombre',
    'refs.nombre.placeholder': 'Ej: Ana García',
    'refs.rol': 'Rol / Empresa',
    'refs.rol.placeholder': 'Ej: Tech Lead @ Google',
    'refs.contacto': 'Contacto',
    'refs.contacto.placeholder': 'Email, teléfono, @usuario...',
    'refs.link': 'Link',
    'refs.relacion': 'Relación',
    'refs.estado': 'Estado del referido',
    'refs.empresas': 'Empresas / postulaciones vinculadas',
    'refs.empresas.optional': '(opcional)',
    'refs.empresas.empty': 'Agregá postulaciones primero para poder vincularlas',
    'refs.notas': 'Notas',
    'refs.notas.placeholder': 'En qué empresa está, si te puede referir, última charla...',
    'refs.submit': 'Agregar referido',
    'refs.search.placeholder': 'Buscar por nombre, empresa, nota...',

    // Relation chips
    'rel.Amigo': 'Amigo',
    'rel.Ex-colega': 'Ex-colega',
    'rel.Familiar': 'Familiar',
    'rel.Conocido': 'Conocido',
    'rel.Recruiter': 'Recruiter',
    'rel.Mentor': 'Mentor',

    // Jobs filters
    'filter.all': 'Todas',
    'filter.active': 'Activas',
    'filter.closed': 'Cerradas',

    // Referral filters
    'refFilter.all': 'Todos',
    'refFilter.Pendiente': 'Pendiente',
    'refFilter.Contactado': 'Contactado',
    'refFilter.Me va a referir': 'Va a referir',
    'refFilter.Referido hecho': 'Referido',
    'refFilter.En proceso': 'En proceso',
    'refFilter.Contratado': 'Contratado',
    'refFilter.No aplica': 'No aplica',

    // Date picker
    'dp.empty': 'Elegí una fecha',
    'dp.today': 'Hoy',
    'dp.yesterday': 'Ayer',
    'dp.lastWeek': '-1 sem',
    'dp.clear': 'Limpiar',

    // Job card
    'job.daysAgoOne': 'hace {n} día',
    'job.daysAgoMany': 'hace {n} días',
    'job.perHour': 'por hora',
    'job.viewOffer': 'Ver oferta',
    'job.history': 'Ver historial',
    'job.historyTitle': 'Ver historial completo de la postulación',
    'job.historyStages': 'etapas',
    'job.referidoOne': 'Referido',
    'job.referidoMany': 'Referidos',
    'job.advanceTo': 'Avanzar a "{step}"',
    'job.backTo': 'Volver a "{step}"',
    'job.backToTitle': 'Volver a {step}',
    'job.notApplicable': 'No aplica',
    'job.notApplicableTitle': 'Esta etapa no aplica, pasar a la siguiente',
    'job.firstStep': 'Primer paso',
    'job.firstStepTitle': 'Ya estás en el primer paso',
    'job.alreadyWentBack': 'Ya volviste atrás una vez en esta postulación',
    'job.confirmOffer': 'Confirmar Oferta',
    'job.nextStep': 'Próximo paso',
    'job.orCloseAs': 'O cerrar como…',
    'job.closeOffer': 'Oferta',
    'job.closeRejected': 'Rechazado',
    'job.closeGhosted': 'Ghosted',
    'job.closeDiscarded': 'Descartado',
    'job.closedLabel': 'Postulación',
    'job.closedOn': 'cerrada el',
    'job.reopen': 'Reabrir',
    'job.dragHandle': 'Arrastrar para reordenar',
    'job.editTitle': 'Editar',
    'job.deleteTitle': 'Borrar',
    'job.refChipTitle': 'Ver referido: {name}',

    // Referral card
    'ref.link': 'Link',
    'ref.goToJob': 'Ir a la postulación en {empresa}',
    'ref.reopen': 'Reabrir',
    'ref.notApplicable': 'No aplica',
    'ref.contratado': 'Contratado',
    'ref.next': '→',
    'ref.prev': '←',
    'ref.reopenTitle': 'Reabrir referido',
    'ref.notApplicableTitle': 'Marcar como No aplica',
    'ref.contratadoTitle': 'Ya contratado',
    'ref.nextTitle': 'Avanzar a {step}',
    'ref.prevTitle': 'Volver a {step}',
    'ref.editTitle': 'Editar',
    'ref.deleteTitle': 'Borrar',
    'ref.historyTitle': 'Ver historial',

    // Empty states
    'empty.jobs.title': 'Todavía no cargaste postulaciones',
    'empty.jobs.subtitle': 'Empezá agregando una arriba ☝️',
    'empty.jobs.filter.title': 'Sin resultados en este filtro',
    'empty.jobs.filter.subtitle': 'Probá con otro filtro',
    'empty.refs.title': 'Todavía no cargaste referidos',
    'empty.refs.subtitle': 'Agregá a alguien que te pueda recomendar',
    'empty.refs.filter.title': 'Sin resultados',
    'empty.refs.filter.subtitle': 'Probá con otro filtro o búsqueda',
    'empty.refToJob': 'No hay postulaciones cargadas todavía',

    // Edit modal
    'modal.edit.title': '✏️ Editar postulación',
    'modal.edit.estadoNote': 'El estado se cambia desde los botones del workflow de la tarjeta.',
    'modal.cancel': 'Cancelar',
    'modal.saveChanges': 'Guardar cambios',
    'modal.close': 'Cerrar',

    // Close modal
    'close.titleDefault': 'Cerrar postulación',
    'close.titleAs': 'Cerrar como {estado}',
    'close.motivo': 'Motivo',
    'close.motivo.placeholder': 'Contá brevemente qué pasó...',
    'close.confirm': 'Confirmar cierre',

    // History modal
    'hist.title': '🕒 Historial de la postulación',
    'hist.refTitle': '🕒 Historial del referido',
    'hist.empty': 'Sin entradas en el historial',
    'hist.current': 'Actual',
    'hist.backward': '↺ Retroceso',
    'hist.closed': 'Cerrada',
    'hist.closedRef': 'Cerrado',
    'hist.offer': '🎉 Oferta',
    'hist.note': 'Nota',
    'hist.skipped': 'Etapas no aplicables',

    // Config modal
    'config.title': '⚙️ Configuración',
    'config.unsaved': 'Sin guardar',
    'config.subtitle': 'Personalizá tu Job Tracker',
    'config.tab.puestos': 'Puestos',
    'config.tab.estados': 'Estados iniciales',
    'config.tab.filtros': 'Filtros',
    'config.tab.apariencia': 'Apariencia',
    'config.tab.idioma': 'Idioma',
    'config.categorias.title': 'Categorías',
    'config.categorias.desc': 'Activá las categorías cuyos puestos quieras ver en el buscador.',
    'config.custom.title': 'Agregar puesto personalizado',
    'config.custom.placeholder': 'Ej: Rust Developer',
    'config.custom.add': 'Agregar',
    'config.available.title': 'Puestos disponibles',
    'config.available.desc': 'Quitá los que no quieras ver. Los personalizados se eliminan del todo.',
    'config.hidden.title': 'Puestos ocultos',
    'config.hidden.desc': 'Restaurá los que quieras recuperar.',
    'config.states.title': 'Estados disponibles',
    'config.states.desc': 'Elegí qué estados aparecen en el dropdown al crear una nueva postulación.',
    'config.defaultState.title': 'Estado por defecto',
    'config.defaultState.desc': 'El estado que viene seleccionado al crear una nueva postulación.',
    'config.filters.title': 'Filtros de postulaciones',
    'config.filters.desc': 'Reordená con las flechas y mostrá/ocultá con el ojo. Los filtros fijos no se pueden eliminar.',
    'config.fixed': 'Fijo',
    'config.logo.title': 'Logo de la app',
    'config.logo.desc': 'Elegí cómo querés que se vea el ícono de Job Tracker.',
    'config.lang.title': 'Idioma de la interfaz',
    'config.lang.desc': 'Elegí el idioma de los textos de la app. Los datos guardados no se modifican.',
    'config.reset': '↺ Restablecer',
    'config.save': '💾 Guardar cambios',
    'config.moveUp': 'Subir',
    'config.moveDown': 'Bajar',
    'config.hideFilter': 'Ocultar filtro',
    'config.showFilter': 'Mostrar filtro',
    'config.removeCustom': 'Eliminar',
    'config.hide': 'Ocultar',
    'config.restore': 'Restaurar',
    'config.noPuestos': 'No hay puestos con las categorías activas. Activá alguna o agregá uno custom.',
    'config.noStates': 'Activá al menos un estado arriba.',

    // Unsaved modal
    'unsaved.title': '⚠️ Cambios sin guardar',
    'unsaved.message': 'Modificaste la configuración pero todavía no la guardaste.<br>¿Qué querés hacer?',
    'unsaved.keep': 'Seguir editando',
    'unsaved.discard': 'Descartar',
    'unsaved.save': 'Guardar y salir',

    // Ref edit modal
    'refEdit.title': '✏️ Editar referido',

    // Ref → Job modal
    'refToJob.title': '🎉 ¡Referido hecho!',
    'refToJob.message': '<strong>{name}</strong> ya te hizo el referido. ¿Querés moverlo a <strong>Postulaciones</strong> para hacerle seguimiento?',
    'refToJob.createNew': 'Crear nueva postulación',
    'refToJob.createNewDesc': 'Se precarga con los datos del referido',
    'refToJob.linkExisting': 'Vincular a una existente',
    'refToJob.linkExistingDesc': 'Elegí una postulación ya cargada',
    'refToJob.available': 'Postulaciones disponibles',
    'refToJob.notNow': 'Ahora no',
    'refToJob.link': 'Vincular',
    'refToJob.alreadyLinked': 'ya vinculado',

    // Note modal
    'note.title': '📝 ¿Agregar un recordatorio?',
    'note.subtitle': 'Vas a pasar a <strong>{step}</strong> en <strong>{name}</strong>. ¿Querés dejar un recordatorio para esta etapa?',
    'note.label': 'Nota / PD (opcional)',
    'note.placeholder': 'Ej: Preparar preguntas sobre el stack, revisar el challenge...',
    'note.skip': 'Continuar sin nota',
    'note.save': 'Guardar y avanzar',

    // Confirm generic
    'confirm.cancel': 'Cancelar',
    'confirm.confirm': 'Confirmar',

    // Confirm dialogs
    'confirm.deleteJob.title': '¿Borrar postulación?',
    'confirm.deleteJob.message': 'Esta acción no se puede deshacer.',
    'confirm.deleteJob.confirm': 'Borrar',
    'confirm.deleteRef.title': '¿Borrar a {name}?',
    'confirm.deleteRef.message': 'Se eliminará de tu lista de referidos.',
    'confirm.deleteRef.confirm': 'Borrar',
    'confirm.resetConfig.title': '¿Restablecer configuración?',
    'confirm.resetConfig.message': 'Se van a borrar tus preferencias de puestos, estados, filtros y apariencia.<br>Esto <strong>no</strong> se aplica hasta que guardes.',
    'confirm.resetConfig.confirm': 'Restablecer',
    'confirm.closeRef.title': '¿Marcar a {name} como "No aplica"?',
    'confirm.closeRef.message': 'Este referido ya no aplica para tu búsqueda.',
    'confirm.closeRef.confirm': 'Marcar',
    'confirm.prevJob.title': '¿Volver a la etapa anterior?',
    'confirm.prevJob.message': 'Vas a retroceder <strong>{puesto}</strong> · {empresa} de <strong>{from}</strong> a <strong>{to}</strong>.<br><span style="color:var(--danger-2);font-size:0.82rem;font-weight:600;">⚠️ Solo podés volver atrás una vez por postulación.</span>',
    'confirm.prevJob.confirm': 'Sí, volver',
    'confirm.prevRef.title': '¿Volver a la etapa anterior?',
    'confirm.prevRef.message': 'Vas a retroceder a <strong>{name}</strong> de <strong>{from}</strong> a <strong>{to}</strong>.<br><span style="color:var(--danger-2);font-size:0.82rem;font-weight:600;">⚠️ Solo podés volver atrás una vez por referido.</span>',
    'confirm.prevRef.confirm': 'Sí, volver',

    // Toasts
    'toast.savedConfig': 'Configuración guardada',
    'toast.discardedChanges': 'Cambios descartados',
    'toast.resetConfig': 'Configuración restablecida (recordá guardar)',
    'toast.roleExists': 'Ese puesto ya existe',
    'toast.roleAdded': 'Puesto agregado',
    'toast.jobAdded': 'Postulación agregada',
    'toast.jobDeleted': 'Postulación borrada',
    'toast.jobReopened': 'Postulación reabierta',
    'toast.orderUpdated': 'Orden actualizado',
    'toast.needReason': 'Escribí o elegí un motivo',
    'toast.closedAs': 'Cerrada como {estado}',
    'toast.refAdded': 'Referido agregado',
    'toast.refDeleted': 'Referido borrado',
    'toast.refUpdated': 'Referido actualizado',
    'toast.refClosed': '{name}: No aplica',
    'toast.refReopened': 'Referido reabierto como Pendiente',
    'toast.alreadyWentBackJob': 'Ya volviste atrás una vez en esta postulación',
    'toast.alreadyWentBackRef': 'Ya volviste atrás una vez en este referido',
    'toast.refNotFound': 'No se encontró el referido',
    'toast.linkedTo': 'Vinculado a {empresa}',
    'toast.alreadyExisted': 'Ya existía postulación en {empresa}. Vinculado.',
    'toast.jobCreatedFromRef': 'Postulación creada desde {name}',
    'toast.advanceTo': '{name}: {estado}',
    'toast.backTo': '{name}: {estado}',

    // Referral company empty
    'refEmpresa.empty': 'Agregá postulaciones primero para poder vincularlas',

    // States (display labels)
    'state.Guardado': 'Guardado',
    'state.Aplicado': 'Aplicado',
    'state.Contacto': 'Contacto',
    'state.Entrevista RRHH': 'Entrevista RRHH',
    'state.Challenge técnico': 'Challenge técnico',
    'state.Live coding': 'Live coding',
    'state.Entrevista Técnica': 'Entrevista Técnica',
    'state.Entrevista con cliente': 'Entrevista con cliente',
    'state.Charla con cliente': 'Charla con cliente',
    'state.Entrevista Final': 'Entrevista Final',
    'state.Referencias': 'Referencias',
    'state.Negociación': 'Negociación',
    'state.Oferta': 'Oferta',
    'state.Rechazado': 'Rechazado',
    'state.Ghosted': 'Ghosted',
    'state.Descartado': 'Descartado',

    'stateShort.Guardado': 'Guardado',
    'stateShort.Aplicado': 'Aplicado',
    'stateShort.Contacto': 'Contacto',
    'stateShort.Entrevista RRHH': 'RRHH',
    'stateShort.Challenge técnico': 'Challenge',
    'stateShort.Live coding': 'Live coding',
    'stateShort.Entrevista Técnica': 'Técnica',
    'stateShort.Entrevista con cliente': 'Entrev. cli.',
    'stateShort.Charla con cliente': 'Charla cli.',
    'stateShort.Entrevista Final': 'Final',
    'stateShort.Referencias': 'Referencias',
    'stateShort.Negociación': 'Negociación',
    'stateShort.Oferta': 'Oferta',
    'stateShort.Rechazado': 'Rechazado',
    'stateShort.Ghosted': 'Ghosted',
    'stateShort.Descartado': 'Descartado',

    // Referral states
    'refState.Pendiente': 'Pendiente',
    'refState.Contactado': 'Contactado',
    'refState.Me va a referir': 'Me va a referir',
    'refState.Referido hecho': 'Referido hecho',
    'refState.En proceso': 'En proceso',
    'refState.Contratado': 'Contratado',
    'refState.No aplica': 'No aplica',

    'refStateShort.Pendiente': 'Pendiente',
    'refStateShort.Contactado': 'Contactado',
    'refStateShort.Me va a referir': 'Va a referir',
    'refStateShort.Referido hecho': 'Referido',
    'refStateShort.En proceso': 'En proceso',
    'refStateShort.Contratado': 'Contratado',
    'refStateShort.No aplica': 'No aplica',
  },

  // ============================================================
  // ENGLISH
  // ============================================================
  en: {
    'app.name': 'Job Tracker',
    'app.subtitle': 'Your job search, organized',
    'app.documentTitle': 'Job Tracker · My job search',
    'action.config': 'Settings',
    'action.theme': 'Switch theme',

    'stats.total': 'Total',
    'stats.active': 'Active',
    'stats.inProcess': 'In process',
    'stats.offers': 'Offers',
    'stats.closed': 'Closed',

    'form.title': '✨ New application',
    'form.subtitle': 'Add a new opportunity',
    'form.toggle': 'Show/hide',
    'form.empresa': 'Company',
    'form.empresa.placeholder': 'Ex: Google',
    'form.puesto': 'Role',
    'form.puesto.placeholder': 'Choose or type a role',
    'form.fecha': 'Date',
    'form.estado': 'Initial status',
    'form.link': 'Job link',
    'form.salario': 'Salary range',
    'form.salario.placeholder': 'Ex: USD 3,000–4,000/month or USD 20–30/h',
    'form.salarioPorHora': 'Per hour',
    'form.contacto': 'Contact',
    'form.contacto.placeholder': 'Ex: Mary Smith (Recruiter)',
    'form.notas': 'Notes',
    'form.notas.placeholder': 'Contact, next step, referrals...',
    'form.submit': 'Add application',

    'jobs.title': '📋 Applications',
    'jobs.subtitle': 'Your process history',

    'refs.title': '🤝 Referrals',
    'refs.subtitle': 'Your network that can recommend you',
    'refs.new': '➕ New referral',
    'refs.nombre': 'Name',
    'refs.nombre.placeholder': 'Ex: Anna Smith',
    'refs.rol': 'Role / Company',
    'refs.rol.placeholder': 'Ex: Tech Lead @ Google',
    'refs.contacto': 'Contact',
    'refs.contacto.placeholder': 'Email, phone, @handle...',
    'refs.link': 'Link',
    'refs.relacion': 'Relationship',
    'refs.estado': 'Referral status',
    'refs.empresas': 'Linked companies / applications',
    'refs.empresas.optional': '(optional)',
    'refs.empresas.empty': 'Add applications first to link them',
    'refs.notas': 'Notes',
    'refs.notas.placeholder': 'Which company, if they can refer you, last chat...',
    'refs.submit': 'Add referral',
    'refs.search.placeholder': 'Search by name, company, note...',

    'rel.Amigo': 'Friend',
    'rel.Ex-colega': 'Ex-colleague',
    'rel.Familiar': 'Family',
    'rel.Conocido': 'Acquaintance',
    'rel.Recruiter': 'Recruiter',
    'rel.Mentor': 'Mentor',

    'filter.all': 'All',
    'filter.active': 'Active',
    'filter.closed': 'Closed',

    'refFilter.all': 'All',
    'refFilter.Pendiente': 'Pending',
    'refFilter.Contactado': 'Contacted',
    'refFilter.Me va a referir': 'Will refer',
    'refFilter.Referido hecho': 'Referred',
    'refFilter.En proceso': 'In process',
    'refFilter.Contratado': 'Hired',
    'refFilter.No aplica': 'Not applicable',

    'dp.empty': 'Pick a date',
    'dp.today': 'Today',
    'dp.yesterday': 'Yesterday',
    'dp.lastWeek': '-1 week',
    'dp.clear': 'Clear',

    'job.daysAgoOne': '{n} day ago',
    'job.daysAgoMany': '{n} days ago',
    'job.perHour': 'per hour',
    'job.viewOffer': 'View job',
    'job.history': 'View history',
    'job.historyTitle': 'View full application history',
    'job.historyStages': 'stages',
    'job.referidoOne': 'Referral',
    'job.referidoMany': 'Referrals',
    'job.advanceTo': 'Advance to "{step}"',
    'job.backTo': 'Back to "{step}"',
    'job.backToTitle': 'Back to {step}',
    'job.notApplicable': 'Not applicable',
    'job.notApplicableTitle': "This stage doesn't apply, go to the next one",
    'job.firstStep': 'First step',
    'job.firstStepTitle': "You're already at the first step",
    'job.alreadyWentBack': 'You already went back once in this application',
    'job.confirmOffer': 'Confirm Offer',
    'job.nextStep': 'Next step',
    'job.orCloseAs': 'Or close as…',
    'job.closeOffer': 'Offer',
    'job.closeRejected': 'Rejected',
    'job.closeGhosted': 'Ghosted',
    'job.closeDiscarded': 'Discarded',
    'job.closedLabel': 'Application',
    'job.closedOn': 'closed on',
    'job.reopen': 'Reopen',
    'job.dragHandle': 'Drag to reorder',
    'job.editTitle': 'Edit',
    'job.deleteTitle': 'Delete',
    'job.refChipTitle': 'View referral: {name}',

    'ref.link': 'Link',
    'ref.goToJob': 'Go to application at {empresa}',
    'ref.reopen': 'Reopen',
    'ref.notApplicable': 'Not applicable',
    'ref.contratado': 'Hired',
    'ref.next': '→',
    'ref.prev': '←',
    'ref.reopenTitle': 'Reopen referral',
    'ref.notApplicableTitle': 'Mark as Not applicable',
    'ref.contratadoTitle': 'Already hired',
    'ref.nextTitle': 'Advance to {step}',
    'ref.prevTitle': 'Back to {step}',
    'ref.editTitle': 'Edit',
    'ref.deleteTitle': 'Delete',
    'ref.historyTitle': 'View history',

    'empty.jobs.title': "You haven't added any applications yet",
    'empty.jobs.subtitle': 'Start by adding one above ☝️',
    'empty.jobs.filter.title': 'No results for this filter',
    'empty.jobs.filter.subtitle': 'Try another filter',
    'empty.refs.title': "You haven't added any referrals yet",
    'empty.refs.subtitle': 'Add someone who can recommend you',
    'empty.refs.filter.title': 'No results',
    'empty.refs.filter.subtitle': 'Try another filter or search',
    'empty.refToJob': 'No applications loaded yet',

    'modal.edit.title': '✏️ Edit application',
    'modal.edit.estadoNote': 'Status changes from the workflow buttons on the card.',
    'modal.cancel': 'Cancel',
    'modal.saveChanges': 'Save changes',
    'modal.close': 'Close',

    'close.titleDefault': 'Close application',
    'close.titleAs': 'Close as {estado}',
    'close.motivo': 'Reason',
    'close.motivo.placeholder': 'Briefly describe what happened...',
    'close.confirm': 'Confirm close',

    'hist.title': '🕒 Application history',
    'hist.refTitle': '🕒 Referral history',
    'hist.empty': 'No history entries',
    'hist.current': 'Current',
    'hist.backward': '↺ Went back',
    'hist.closed': 'Closed',
    'hist.closedRef': 'Closed',
    'hist.offer': '🎉 Offer',
    'hist.note': 'Note',
    'hist.skipped': 'Skipped stages',

    'config.title': '⚙️ Settings',
    'config.unsaved': 'Unsaved',
    'config.subtitle': 'Customize your Job Tracker',
    'config.tab.puestos': 'Roles',
    'config.tab.estados': 'Initial statuses',
    'config.tab.filtros': 'Filters',
    'config.tab.apariencia': 'Appearance',
    'config.tab.idioma': 'Language',
    'config.categorias.title': 'Categories',
    'config.categorias.desc': 'Enable the categories whose roles you want to see in the picker.',
    'config.custom.title': 'Add custom role',
    'config.custom.placeholder': 'Ex: Rust Developer',
    'config.custom.add': 'Add',
    'config.available.title': 'Available roles',
    'config.available.desc': "Remove the ones you don't want to see. Custom ones are deleted entirely.",
    'config.hidden.title': 'Hidden roles',
    'config.hidden.desc': 'Restore the ones you want back.',
    'config.states.title': 'Available statuses',
    'config.states.desc': 'Choose which statuses appear in the dropdown when creating an application.',
    'config.defaultState.title': 'Default status',
    'config.defaultState.desc': 'The status preselected when creating a new application.',
    'config.filters.title': 'Application filters',
    'config.filters.desc': 'Reorder with the arrows and show/hide with the eye. Fixed filters cannot be removed.',
    'config.fixed': 'Fixed',
    'config.logo.title': 'App logo',
    'config.logo.desc': 'Choose how the Job Tracker icon looks.',
    'config.lang.title': 'Interface language',
    'config.lang.desc': 'Choose the language of the app texts. Saved data is not modified.',
    'config.reset': '↺ Reset',
    'config.save': '💾 Save changes',
    'config.moveUp': 'Move up',
    'config.moveDown': 'Move down',
    'config.hideFilter': 'Hide filter',
    'config.showFilter': 'Show filter',
    'config.removeCustom': 'Delete',
    'config.hide': 'Hide',
    'config.restore': 'Restore',
    'config.noPuestos': 'No roles with active categories. Enable one or add a custom role.',
    'config.noStates': 'Enable at least one status above.',

    'unsaved.title': '⚠️ Unsaved changes',
    'unsaved.message': "You modified the settings but haven't saved yet.<br>What do you want to do?",
    'unsaved.keep': 'Keep editing',
    'unsaved.discard': 'Discard',
    'unsaved.save': 'Save and exit',

    'refEdit.title': '✏️ Edit referral',

    'refToJob.title': '🎉 Referral done!',
    'refToJob.message': '<strong>{name}</strong> has referred you. Do you want to move it to <strong>Applications</strong> to track it?',
    'refToJob.createNew': 'Create new application',
    'refToJob.createNewDesc': 'Pre-filled with the referral data',
    'refToJob.linkExisting': 'Link to existing',
    'refToJob.linkExistingDesc': 'Choose an already loaded application',
    'refToJob.available': 'Available applications',
    'refToJob.notNow': 'Not now',
    'refToJob.link': 'Link',
    'refToJob.alreadyLinked': 'already linked',

    'note.title': '📝 Add a reminder?',
    'note.subtitle': 'Moving to <strong>{step}</strong> at <strong>{name}</strong>. Want to leave a reminder for this stage?',
    'note.label': 'Note / To-do (optional)',
    'note.placeholder': 'Ex: Prepare stack questions, review the challenge...',
    'note.skip': 'Continue without note',
    'note.save': 'Save and advance',

    'confirm.cancel': 'Cancel',
    'confirm.confirm': 'Confirm',

    'confirm.deleteJob.title': 'Delete application?',
    'confirm.deleteJob.message': "This can't be undone.",
    'confirm.deleteJob.confirm': 'Delete',
    'confirm.deleteRef.title': 'Delete {name}?',
    'confirm.deleteRef.message': 'It will be removed from your referral list.',
    'confirm.deleteRef.confirm': 'Delete',
    'confirm.resetConfig.title': 'Reset settings?',
    'confirm.resetConfig.message': 'Your preferences for roles, statuses, filters, and appearance will be cleared.<br>This is <strong>not</strong> applied until you save.',
    'confirm.resetConfig.confirm': 'Reset',
    'confirm.closeRef.title': 'Mark {name} as "Not applicable"?',
    'confirm.closeRef.message': 'This referral no longer applies to your search.',
    'confirm.closeRef.confirm': 'Mark',
    'confirm.prevJob.title': 'Go back to previous stage?',
    'confirm.prevJob.message': 'You will move <strong>{puesto}</strong> · {empresa} from <strong>{from}</strong> back to <strong>{to}</strong>.<br><span style="color:var(--danger-2);font-size:0.82rem;font-weight:600;">⚠️ You can only go back once per application.</span>',
    'confirm.prevJob.confirm': 'Yes, go back',
    'confirm.prevRef.title': 'Go back to previous stage?',
    'confirm.prevRef.message': 'You will move <strong>{name}</strong> from <strong>{from}</strong> back to <strong>{to}</strong>.<br><span style="color:var(--danger-2);font-size:0.82rem;font-weight:600;">⚠️ You can only go back once per referral.</span>',
    'confirm.prevRef.confirm': 'Yes, go back',

    'toast.savedConfig': 'Settings saved',
    'toast.discardedChanges': 'Changes discarded',
    'toast.resetConfig': 'Settings reset (remember to save)',
    'toast.roleExists': 'That role already exists',
    'toast.roleAdded': 'Role added',
    'toast.jobAdded': 'Application added',
    'toast.jobDeleted': 'Application deleted',
    'toast.jobReopened': 'Application reopened',
    'toast.orderUpdated': 'Order updated',
    'toast.needReason': 'Write or pick a reason',
    'toast.closedAs': 'Closed as {estado}',
    'toast.refAdded': 'Referral added',
    'toast.refDeleted': 'Referral deleted',
    'toast.refUpdated': 'Referral updated',
    'toast.refClosed': '{name}: Not applicable',
    'toast.refReopened': 'Referral reopened as Pending',
    'toast.alreadyWentBackJob': 'You already went back once in this application',
    'toast.alreadyWentBackRef': 'You already went back once in this referral',
    'toast.refNotFound': 'Referral not found',
    'toast.linkedTo': 'Linked to {empresa}',
    'toast.alreadyExisted': 'An application for {empresa} already existed. Linked.',
    'toast.jobCreatedFromRef': 'Application created from {name}',
    'toast.advanceTo': '{name}: {estado}',
    'toast.backTo': '{name}: {estado}',

    'refEmpresa.empty': 'Add applications first to link them',

    'state.Guardado': 'Saved',
    'state.Aplicado': 'Applied',
    'state.Contacto': 'Contact',
    'state.Entrevista RRHH': 'HR Interview',
    'state.Challenge técnico': 'Technical challenge',
    'state.Live coding': 'Live coding',
    'state.Entrevista Técnica': 'Technical Interview',
    'state.Entrevista con cliente': 'Client interview',
    'state.Charla con cliente': 'Client chat',
    'state.Entrevista Final': 'Final Interview',
    'state.Referencias': 'References',
    'state.Negociación': 'Negotiation',
    'state.Oferta': 'Offer',
    'state.Rechazado': 'Rejected',
    'state.Ghosted': 'Ghosted',
    'state.Descartado': 'Discarded',

    'stateShort.Guardado': 'Saved',
    'stateShort.Aplicado': 'Applied',
    'stateShort.Contacto': 'Contact',
    'stateShort.Entrevista RRHH': 'HR',
    'stateShort.Challenge técnico': 'Challenge',
    'stateShort.Live coding': 'Live coding',
    'stateShort.Entrevista Técnica': 'Tech',
    'stateShort.Entrevista con cliente': 'Client int.',
    'stateShort.Charla con cliente': 'Client chat',
    'stateShort.Entrevista Final': 'Final',
    'stateShort.Referencias': 'References',
    'stateShort.Negociación': 'Negotiation',
    'stateShort.Oferta': 'Offer',
    'stateShort.Rechazado': 'Rejected',
    'stateShort.Ghosted': 'Ghosted',
    'stateShort.Descartado': 'Discarded',

    'refState.Pendiente': 'Pending',
    'refState.Contactado': 'Contacted',
    'refState.Me va a referir': 'Will refer me',
    'refState.Referido hecho': 'Referral done',
    'refState.En proceso': 'In process',
    'refState.Contratado': 'Hired',
    'refState.No aplica': 'Not applicable',

    'refStateShort.Pendiente': 'Pending',
    'refStateShort.Contactado': 'Contacted',
    'refStateShort.Me va a referir': 'Will refer',
    'refStateShort.Referido hecho': 'Referral',
    'refStateShort.En proceso': 'In process',
    'refStateShort.Contratado': 'Hired',
    'refStateShort.No aplica': 'N/A',
  },
};

// ------------------------------------------------------------
// Public state
// ------------------------------------------------------------
let currentLang = 'es';

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (translations[lang]) currentLang = lang;
}

export const AVAILABLE_LANGS = Object.keys(translations);

// ------------------------------------------------------------
// Translation function with `{placeholder}` interpolation
// ------------------------------------------------------------
export function t(key, params = {}) {
  const dict = translations[currentLang] || translations.es;
  const fallback = translations.es;
  let raw = dict[key];
  if (raw === undefined) raw = fallback[key];
  if (raw === undefined) {
    console.warn('[i18n] Missing key:', key, '| lang:', currentLang);
    raw = key;
  }
  if (!params || Object.keys(params).length === 0) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined && params[k] !== null ? String(params[k]) : `{${k}}`
  );
}

// ------------------------------------------------------------
// Helpers for state labels
// ------------------------------------------------------------
export function tState(id)         { return t('state.' + id); }
export function tStateShort(id)    { return t('stateShort.' + id); }
export function tRefState(id)      { return t('refState.' + id); }
export function tRefStateShort(id) { return t('refStateShort.' + id); }

// ------------------------------------------------------------
// Apply translations to a DOM tree
// Supports:
//   data-i18n="key"              → textContent
//   data-i18n-html="key"         → innerHTML
//   data-i18n-placeholder="key"  → placeholder
//   data-i18n-title="key"        → title
//   <html data-i18n-title-doc="key"> → document.title
// ------------------------------------------------------------
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  const docKey = document.documentElement.dataset.i18nTitleDoc;
  if (docKey) document.title = t(docKey);
  document.documentElement.lang = currentLang;
}