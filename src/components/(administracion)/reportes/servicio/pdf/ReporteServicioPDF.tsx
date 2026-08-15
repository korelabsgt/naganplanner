import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Rect, Path } from '@react-pdf/renderer';
import { ReporteItem, IntegranteReporte } from '../lib/zod';

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
    textTransform: 'capitalize',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8AC32',
  },
  logoTextApp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  churchNameContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  churchName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8AC32',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'semibold',
    padding: 8,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    minHeight: 28,
  },
  tableRowAgrupador: {
    backgroundColor: '#FFF4E5',
  },
  colNum: { width: '8%', textAlign: 'center' },
  colTitle: { width: '38%' },
  colResp: { width: '28%' },
  colTime: { width: '12%', textAlign: 'center' },
  colDur: { width: '14%', textAlign: 'center' },
  badgeNumBase: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  badgeNumAgrupador: { backgroundColor: '#F8AC32' },
  badgeNumHijo: { backgroundColor: '#d1fae5' },
  badgeNumSubhijo: { backgroundColor: '#dbeafe' },
  textNumBase: { fontSize: 8, fontWeight: 'bold' },
  textNumAgrupador: { color: 'white' },
  textNumHijo: { color: '#047857' },
  textNumSubhijo: { color: '#1d4ed8' },
  cellText: {
    fontSize: 9,
    color: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  cellTextAgrupador: {
    color: '#E09827',
    fontWeight: 'bold',
  },
  badgeResp: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  textResp: {
    fontSize: 8,
    color: '#374151',
  },
  badgeDurBase: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  badgeDurAgrupador: { backgroundColor: '#FEF0DB' },
  badgeDurNormal: { backgroundColor: '#f3f4f6' },
  textDurBase: { fontSize: 9, fontWeight: 'bold' },
  textDurAgrupador: { color: '#E09827' },
  textDurNormal: { color: '#4b5563' },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#FFF4E5',
    borderTopWidth: 2,
    borderTopColor: '#FDE3BA',
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  footerText: {
    width: '86%',
    textAlign: 'right',
    padding: 10,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E09827',
  },
  footerValue: {
    width: '14%',
    textAlign: 'center',
    padding: 10,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E09827',
  }
});

interface Props {
  reporte: ReporteItem[];
  fechaFormateada: string;
  horaServicio: string;
  tiempoTotal: number;
  nombreIglesia?: string;
}

const renderFilas = (items: ReporteItem[], nivel = 0): React.ReactNode[] => {
  return items.flatMap((item) => {
    const esAgrupador = item.tipo === 'agrupador';
    
    // Logic for number badge colors
    const numBadgeStyle = esAgrupador 
      ? styles.badgeNumAgrupador 
      : nivel > 0 ? styles.badgeNumHijo : styles.badgeNumSubhijo;
    const numTextStyle = esAgrupador 
      ? styles.textNumAgrupador 
      : nivel > 0 ? styles.textNumHijo : styles.textNumSubhijo;

    const fila = (
      <View key={item.numero} style={[styles.tableRow, ...(esAgrupador ? [styles.tableRowAgrupador] : [])]} wrap={false}>
        <View style={styles.colNum}>
          <View style={[styles.badgeNumBase, numBadgeStyle]}>
            <Text style={[styles.textNumBase, numTextStyle]}>{item.numero}</Text>
          </View>
        </View>
        <View style={styles.colTitle}>
          <Text style={[styles.cellText, ...(esAgrupador ? [styles.cellTextAgrupador] : []), { paddingLeft: 6 + (nivel * 10) }]}>
            {item.nombre}
          </Text>
        </View>
        <View style={[styles.colResp, { paddingVertical: 4, paddingHorizontal: 6 }]}>
          {!esAgrupador && (
            item.integrantes?.length > 0 ? (
              <View style={{ flexDirection: 'column' }}>
                {item.integrantes.map((i: IntegranteReporte, idx: number) => (
                  <View key={idx} style={styles.badgeResp}>
                    <Text style={styles.textResp}>{i.nombre}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#9ca3af' }}>
                Sin asignar
              </Text>
            )
          )}
        </View>
        <View style={styles.colTime}>
          {!esAgrupador && item.hora_inicio && item.tiempo_minutos > 0 ? (
            <Text style={styles.cellText}>{item.hora_inicio}</Text>
          ) : (
            <Text style={[styles.cellText, { color: '#d1d5db' }]}>-</Text>
          )}
        </View>
        <View style={styles.colDur}>
          {item.tiempo_minutos > 0 ? (
            <View style={[styles.badgeDurBase, esAgrupador ? styles.badgeDurAgrupador : styles.badgeDurNormal]}>
              <Text style={[styles.textDurBase, esAgrupador ? styles.textDurAgrupador : styles.textDurNormal]}>
                {item.tiempo_minutos} min
              </Text>
            </View>
          ) : (
            <Text style={[styles.cellText, { color: '#d1d5db' }]}>-</Text>
          )}
        </View>
      </View>
    );

    if (item.hijos && item.hijos.length > 0) {
      return [fila, ...renderFilas(item.hijos, nivel + 1)];
    }
    return [fila];
  });
};

export default function ReporteServicioPDF({ reporte, fechaFormateada, horaServicio, tiempoTotal, nombreIglesia }: Props) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.systemSubtitle}>Sistema de Gestión Ministerial Modular</Text>
            <Text style={styles.title}>Programa General de Servicio</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={[styles.subtitle, { marginTop: 0 }]}>
                {fechaFormateada} 
                {horaServicio ? (
                  <Text>
                    <Text style={{ color: '#d1d5db' }}> • </Text>
                    <Text style={{ color: '#F8AC32', fontWeight: 'bold' }}>{horaServicio}</Text>
                  </Text>
                ) : ''}
              </Text>
            </View>
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

        {nombreIglesia && (
          <View style={styles.churchNameContainer}>
            <Text style={styles.churchName}>{nombreIglesia}</Text>
          </View>
        )}

        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader} fixed>
            <View style={styles.colNum}><Text style={styles.tableHeaderCell}>N°</Text></View>
            <View style={styles.colTitle}><Text style={styles.tableHeaderCell}>PUNTO DEL PROGRAMA</Text></View>
            <View style={styles.colResp}><Text style={styles.tableHeaderCell}>RESPONSABLE(S)</Text></View>
            <View style={styles.colTime}><Text style={styles.tableHeaderCell}>HORA</Text></View>
            <View style={styles.colDur}><Text style={styles.tableHeaderCell}>DURACIÓN</Text></View>
          </View>

          {/* Body */}
          {renderFilas(reporte)}

          {/* Footer */}
          <View style={styles.footer} wrap={false}>
            <Text style={styles.footerText}>TIEMPO TOTAL DEL SERVICIO</Text>
            <Text style={styles.footerValue}>{tiempoTotal} min</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
