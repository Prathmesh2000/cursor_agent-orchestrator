---
name: mui-components
description: Use when building UI with Material UI (MUI) v6. Triggers: "MUI", "Material UI", "MUI component", "MUI theme", "sx prop", "custom MUI", "MUI form", "MUI table", "MUI dialog", "MUI styling", or any React UI work where MUI is the component library. Covers theming, custom variants, sx prop patterns, component composition, and production-ready MUI architecture.
---

# MUI Components Skill

Build production-grade UIs with MUI v6: custom theme system, component variants, sx prop patterns, form integration, and design token alignment.

---

## Theme Setup (create once, use everywhere)

```typescript
// src/theme/theme.ts
import { createTheme, ThemeOptions } from '@mui/material/styles';

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7c3aed',
      contrastText: '#ffffff',
    },
    error:   { main: '#dc2626' },
    warning: { main: '#d97706' },
    success: { main: '#16a34a' },
    grey: {
      50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb',
      300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280',
      600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827',
    },
    background: { default: '#f9fafb', paper: '#ffffff' },
    text: { primary: '#111827', secondary: '#6b7280' },
  },

  typography: {
    fontFamily: '"Inter", "system-ui", "sans-serif"',
    h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: '1.5rem',   fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.25rem',  fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '1rem',     fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: '1rem',    lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5, color: '#6b7280' },
    button: { textTransform: 'none', fontWeight: 500 }, // ← disable ALL_CAPS
  },

  shape: { borderRadius: 8 },

  spacing: 4, // 1 unit = 4px → theme.spacing(2) = 8px

  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    ...Array(19).fill('none'), // MUI requires 25 shadow levels
  ] as any,

  components: {
    // ─── Button ───────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 16px',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        sizeLarge:  { padding: '10px 20px', fontSize: '1rem' },
        sizeSmall:  { padding: '4px 12px',  fontSize: '0.8125rem' },
      },
      variants: [
        {
          props: { variant: 'soft' },
          style: ({ theme }: any) => ({
            backgroundColor: theme.palette.primary.main + '18',
            color: theme.palette.primary.main,
            '&:hover': { backgroundColor: theme.palette.primary.main + '28' },
          }),
        },
        {
          props: { variant: 'soft', color: 'error' },
          style: ({ theme }: any) => ({
            backgroundColor: theme.palette.error.main + '18',
            color: theme.palette.error.main,
            '&:hover': { backgroundColor: theme.palette.error.main + '28' },
          }),
        },
      ],
    },

    // ─── TextField ────────────────────────────────────────────────
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            backgroundColor: '#ffffff',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          },
        },
      },
    },

    // ─── Card ─────────────────────────────────────────────────────
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          '&:hover': { borderColor: '#d1d5db' },
        },
      },
    },

    // ─── Chip ─────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 500 },
        sizeSmall: { height: 22, fontSize: '0.75rem' },
      },
    },

    // ─── Table ────────────────────────────────────────────────────
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#f9fafb',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: '#374151',
            borderBottom: '1px solid #e5e7eb',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#f9fafb' },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },

    // ─── Dialog ───────────────────────────────────────────────────
    MuiDialog: {
      defaultProps: { maxWidth: 'sm', fullWidth: true },
      styleOverrides: {
        paper: { borderRadius: 12, padding: 0 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { padding: '20px 24px 12px', fontWeight: 600 },
      },
    },

    // ─── Alert ────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, alignItems: 'center' },
      },
    },
  },
};

// Augment types for custom variants
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true;
  }
}

export const theme = createTheme(themeOptions);

// Dark mode variant
export const darkTheme = createTheme({
  ...themeOptions,
  palette: {
    ...themeOptions.palette,
    mode: 'dark',
    background: { default: '#0f172a', paper: '#1e293b' },
    text: { primary: '#f1f5f9', secondary: '#94a3b8' },
  },
});
```

```tsx
// src/main.tsx — wrap your app
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />   {/* normalize + apply bg */}
      <Router>...</Router>
    </ThemeProvider>
  );
}
```

---

## sx Prop Patterns

```tsx
// ─── Responsive values ────────────────────────────────────────────
<Box sx={{ width: { xs: '100%', md: '50%', lg: '33%' } }} />
<Typography sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }} />

// ─── Theme tokens in sx ───────────────────────────────────────────
<Box sx={{
  bgcolor: 'primary.main',           // palette.primary.main
  color: 'text.secondary',           // palette.text.secondary
  p: 3,                              // spacing(3) = 12px
  mt: { xs: 2, md: 4 },             // responsive margin-top
  borderRadius: 2,                   // shape.borderRadius * 2 = 16px
  border: '1px solid',
  borderColor: 'divider',            // theme divider color
}} />

// ─── Pseudo-classes ───────────────────────────────────────────────
<ButtonBase sx={{
  '&:hover': { bgcolor: 'action.hover' },
  '&:active': { transform: 'scale(0.98)' },
  '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
}} />

// ─── Nested selectors ─────────────────────────────────────────────
<Paper sx={{
  '& .MuiTypography-root': { color: 'text.secondary' },
  '& + &': { mt: 2 },              // adjacent sibling
  '& > *:not(:last-child)': { mb: 1 },
}} />

// ─── Dark mode conditional ────────────────────────────────────────
<Box sx={{
  bgcolor: (theme) =>
    theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
}} />
```

---

## Production Component Patterns

### Data Table with sorting, pagination, actions

```tsx
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel,
  Paper, IconButton, Tooltip, Chip, Skeleton,
} from '@mui/material';

interface Column<T> {
  id: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  width?: number | string;
}

function DataTable<T extends { id: string | number }>({
  columns, rows, isLoading, onEdit, onDelete,
}: {
  columns: Column<T>[];
  rows: T[];
  isLoading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}) {
  const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = React.useState<keyof T>(columns[0].id);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  if (isLoading) return <TableSkeleton columns={columns.length} rows={5} />;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={String(col.id)} width={col.width}>
                  {col.sortable ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : 'asc'}
                      onClick={() => {/* sort logic */}}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : col.label}
                </TableCell>
              ))}
              {(onEdit || onDelete) && <TableCell width={80} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
              <TableRow key={row.id} hover>
                {columns.map((col) => (
                  <TableCell key={String(col.id)}>
                    {col.render ? col.render(row[col.id], row) : String(row[col.id])}
                  </TableCell>
                ))}
                {(onEdit || onDelete) && (
                  <TableCell>
                    {onEdit && (
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>
  );
}

// Skeleton loader for table
function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Table size="small">
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: columns }).map((_, j) => (
                <TableCell key={j}><Skeleton /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
```

### Form with MUI + React Hook Form

```tsx
import { useForm, Controller } from 'react-hook-form';
import {
  TextField, Select, MenuItem, FormControl, FormHelperText,
  InputLabel, Autocomplete, DatePicker, Stack, Button,
} from '@mui/material';

function UserForm({ onSubmit, defaultValues }) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: defaultValues ?? { name: '', role: '', email: '' },
  });

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} spacing={3}>
      <Controller
        name="name"
        control={control}
        rules={{ required: 'Name is required', minLength: { value: 2, message: 'Min 2 chars' } }}
        render={({ field }) => (
          <TextField
            {...field}
            label="Full Name"
            error={!!errors.name}
            helperText={errors.name?.message}
          />
        )}
      />

      <Controller
        name="role"
        control={control}
        rules={{ required: 'Role is required' }}
        render={({ field }) => (
          <FormControl error={!!errors.role} fullWidth size="small">
            <InputLabel>Role</InputLabel>
            <Select {...field} label="Role">
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="editor">Editor</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
            {errors.role && <FormHelperText>{errors.role.message}</FormHelperText>}
          </FormControl>
        )}
      />

      <Button type="submit" variant="contained" loading={isSubmitting} size="large">
        Save User
      </Button>
    </Stack>
  );
}
```

### Status Chip helper

```tsx
const STATUS_CONFIG = {
  active:   { label: 'Active',   color: 'success' },
  inactive: { label: 'Inactive', color: 'default' },
  pending:  { label: 'Pending',  color: 'warning' },
  error:    { label: 'Error',    color: 'error' },
} as const;

function StatusChip({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const { label, color } = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return <Chip label={label} color={color as any} size="small" variant="filled" />;
}
```

---

## Layout Patterns

```tsx
// Dashboard shell
function DashboardLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <Container maxWidth="xl" sx={{ flex: 1, py: 4, px: { xs: 2, md: 4 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}

// Page header with actions
function PageHeader({ title, subtitle, actions }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4 }}>
      <Box>
        <Typography variant="h4" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
    </Box>
  );
}

// Stats cards row
function StatsRow({ stats }: { stats: Array<{ label: string; value: string; delta?: string; color?: string }> }) {
  return (
    <Grid2 container spacing={2} sx={{ mb: 4 }}>
      {stats.map((stat) => (
        <Grid2 key={stat.label} size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                {stat.label}
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                {stat.value}
              </Typography>
              {stat.delta && (
                <Typography variant="caption" color={stat.color ?? 'success.main'}>
                  {stat.delta}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid2>
      ))}
    </Grid2>
  );
}
```

---

## MUI + Sass Integration

When using both MUI and Sass:
```scss
// Use CSS custom properties from MUI theme for Sass access
:root {
  --mui-primary: #{map.get($palette, 'primary-main')};
}

// Target MUI components in Sass (scoped)
.my-module {
  :global(.MuiButton-root) {
    // override only within this module
  }
}
```

---

## Checklist Before Shipping MUI Component

- [ ] `textTransform: 'none'` on buttons (in theme or override)
- [ ] `CssBaseline` present in app root
- [ ] All forms use `Controller` from react-hook-form
- [ ] Loading state: use `Skeleton` not spinner where possible
- [ ] Error states: `helperText` + `error` prop on inputs
- [ ] Responsive: test 375px, 768px, 1280px breakpoints
- [ ] Dark mode: no hardcoded hex colors — use palette tokens
- [ ] Custom variants declared in module augmentation
