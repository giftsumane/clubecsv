import { startPayment, waitForPayment } from '@/services/payments';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  type: 'album' | 'content';
  targetId: number;
  label?: string;
};

export default function PurchaseButton({ type, targetId, label }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    try {
      setLoading(true);

      const reference = await startPayment(type, targetId);

      /*Alert.alert(
        'Pagamento iniciado',
        'Conclua o pagamento na página aberta. Vamos verificar o estado automaticamente.'
      );*/

      const result = await waitForPayment(reference, 12, 3000);

      if (result.status === 'paid') {
       /* Alert.alert('Sucesso', 'Pagamento confirmado com sucesso.');*/
        router.replace('/(tabs)/library');
        return;
      }

      if (result.status === 'failed' || result.status === 'canceled') {
        Alert.alert('Pagamento não concluído', 'O pagamento falhou ou foi cancelado.');
        return;
      }

     /* Alert.alert(
        'Pagamento pendente',
        'Ainda não recebemos a confirmação. Verifica novamente dentro de instantes.'
      );*/
    } catch (error: any) {
      Alert.alert(
        'Erro',
        error?.response?.data?.message ||
          error?.message ||
          'Falha ao iniciar pagamento.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={[styles.button, loading && styles.disabled]} onPress={handlePurchase} disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{label || 'Comprar'}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  disabled: {
    opacity: 0.7,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});