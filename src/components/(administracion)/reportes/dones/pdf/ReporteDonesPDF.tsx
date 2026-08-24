import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { DonReporte } from '../Lib/zod';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#F8AC32',
    paddingBottom: 15,
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
  },
  systemSubtitle: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E09827',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 6,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  logoIconContainer: {
    backgroundColor: '#111827',
    borderRadius: 12,
    width: 24,
    height: 24,
  },
  logoIcon: {
    width: 24,
    height: 24,
  },
  logoTextContainer: {
    flexDirection: 'row',
    marginLeft: 6,
  },
  logoTextBrand: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E09827',
  },
  logoTextApp: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#111827',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8AC32',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 30,
  },
  colNo: { width: '5%', fontSize: 9, color: '#4b5563', textAlign: 'center' },
  colFecha: { width: '12%', fontSize: 8, color: '#111827', textAlign: 'center' },
  colNombre: { width: '28%', fontSize: 9, color: '#111827', fontWeight: 'bold', textAlign: 'center' },
  colPalabras: { width: '40%', fontSize: 9, color: '#374151', paddingRight: 8, textAlign: 'justify' },
  colCitas: { width: '15%', fontSize: 9, color: '#6b7280', textAlign: 'center' },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    textAlign: 'center',
  }
});

interface Props {
  dones: DonReporte[];
  mesFiltro: string; 
}

const formatFechaPdf = (iso: string | null) => {
  if (!iso) return 'Sin fecha';
  try {
    const parts = iso.split('T')[0].split('-');
    if (parts.length !== 3) return iso;
    const [year, month, day] = parts;
    const fechaObj = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(fechaObj.getTime())) return iso;
    
    const wd = fechaObj.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
    const wdCap = wd.charAt(0).toUpperCase() + wd.slice(1);
    const dd = String(fechaObj.getDate()).padStart(2, '0');
    const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const yy = String(fechaObj.getFullYear()).slice(-2);
    
    return `${wdCap} ${dd}/${mm}/${yy}`;
  } catch {
    return iso;
  }
};

export default function ReporteDonesPDF({ dones, mesFiltro }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.systemSubtitle}>SISTEMA DE REPORTES</Text>
            <Text style={styles.title}>Reporte de Dones Espirituales</Text>
            <Text style={styles.subtitle}>Periodo: {mesFiltro}</Text>
          </View>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconContainer}>
              <Image src="/icon.png" style={styles.logoIcon} />
            </View>
            <View style={styles.logoTextContainer}>
              <Text style={styles.logoTextBrand}>Nagan </Text>
              <Text style={styles.logoTextApp}>Planner</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colNo, styles.headerText]}>NO.</Text>
            <Text style={[styles.colFecha, styles.headerText]}>FECHA</Text>
            <Text style={[styles.colNombre, styles.headerText]}>NOMBRE</Text>
            <Text style={[styles.colPalabras, styles.headerText]}>PALABRAS</Text>
            <Text style={[styles.colCitas, styles.headerText]}>CITAS</Text>
          </View>

          {dones.map((don, idx) => {
            const palabrasNombre = don.nombre_persona ? don.nombre_persona.split(' ') : [];
            const lineasNombre = [];
            for (let i = 0; i < palabrasNombre.length; i += 2) {
              lineasNombre.push(palabrasNombre.slice(i, i + 2).join(' '));
            }
            const nombreFormateado = lineasNombre.join('\n');

            return (
              <View key={don.id} style={styles.tableRow} wrap={false}>
                <Text style={styles.colNo}>{idx + 1}</Text>
                <Text style={styles.colFecha}>{formatFechaPdf(don.fecha)}</Text>
                <Text style={styles.colNombre}>{nombreFormateado}</Text>
                <Text style={styles.colPalabras}>{don.palabras}</Text>
                <Text style={styles.colCitas}>{don.citas_biblicas || 'Sin citas'}</Text>
              </View>
            );
          })}
          
          {dones.length === 0 && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>No hay registros para este periodo.</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
