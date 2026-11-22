import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { base } from '@/mocks/manejadores';
import { servidor } from '@/mocks/servidor';
import { renderizarApp } from '@/test/utilidades';

describe('identidad y acceso (RF-01 a RF-03)', () => {
  it('sin sesión, cualquier ruta protegida lleva al acceso', async () => {
    const { enrutador } = renderizarApp('/boletos');
    await screen.findByRole('button', { name: 'Iniciar sesión' });
    expect(enrutador.state.location.pathname).toBe('/acceso');
  });

  it('CP-05: inicia sesión con correo y contraseña y entra al inicio', async () => {
    const { usuario, enrutador } = renderizarApp('/acceso');
    await usuario.type(await screen.findByLabelText('Correo o CURP'), 'asistente@uv.mx');
    await usuario.type(screen.getByLabelText('Contraseña'), 'enzona123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toBe('/'));
    expect(sessionStorage.getItem('enzona.sesion')).toContain('asistente@uv.mx');
  });

  it('CP-06: credenciales inválidas muestran el error sin revelar la causa', async () => {
    const { usuario } = renderizarApp('/acceso');
    await usuario.type(await screen.findByLabelText('Correo o CURP'), 'asistente@uv.mx');
    await usuario.type(screen.getByLabelText('Contraseña'), 'incorrecta1');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(sessionStorage.getItem('enzona.sesion')).toBeNull();
  });

  it('el acceso del personal rechaza cuentas sin rol de personal', async () => {
    const { usuario } = renderizarApp('/acceso/personal');
    await usuario.type(await screen.findByLabelText('Correo o CURP'), 'asistente@uv.mx');
    await usuario.type(screen.getByLabelText('Contraseña'), 'enzona123');
    await usuario.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene permisos de personal');
  });

  it('el registro no pide teléfono y avisa que el código llega al correo', async () => {
    renderizarApp('/registro');
    expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Teléfono/)).not.toBeInTheDocument();
    expect(screen.getByText('Te enviaremos un código de verificación a este correo.')).toBeInTheDocument();
  });

  it('si la API pide también el código del teléfono, explica cómo activar la cuenta y no lo solicita', async () => {
    base().usuarios.push({
      ...base().usuarios[0],
      id: 900,
      correo: 'con.telefono@correo.com',
      curp: 'TELE010101HVZRSS05',
      telefono: '2721234567',
      estado: 'PENDIENTE',
      correoVerificado: false,
      codigo: '123456',
    });
    const { usuario } = renderizarApp('/verificacion?correo=con.telefono%40correo.com');
    await usuario.type(await screen.findByLabelText('Código de verificación'), '123456');
    await usuario.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(await screen.findByText(/por ahora EnZona no envía SMS/)).toBeInTheDocument();
    expect(screen.getByText('Tu correo quedó verificado, pero falta confirmar el teléfono.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verificar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeDisabled();
  });

  it('un fallo al reenviar se muestra aparte y no marca el código como incorrecto', async () => {
    servidor.use(
      http.post('*/api/auth/verificacion/reenvio', () =>
        HttpResponse.json({ codigo: 'DEMASIADOS_INTENTOS', detail: 'Espera' }, { status: 429 }),
      ),
    );
    const { usuario } = renderizarApp('/verificacion?correo=nuevo%40correo.com');
    await usuario.click(await screen.findByRole('button', { name: 'Reenviar código' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
    expect(screen.queryByText(/permanece sin activar/)).not.toBeInTheDocument();
  });

  it('un reenvío correcto avisa que el código anterior sigue vigente e inicia la espera', async () => {
    const { usuario } = renderizarApp('/verificacion?correo=nuevo%40correo.com');
    await usuario.click(await screen.findByRole('button', { name: 'Reenviar código' }));
    expect(await screen.findByText(/el anterior sigue vigente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reenviar código \(\d+ s\)/ })).toBeDisabled();
  });

  it('CP-03: el registro señala un CURP con formato inválido y no envía nada', async () => {
    const { usuario } = renderizarApp('/registro');
    await usuario.type(await screen.findByLabelText('Nombre completo'), 'Luis Pérez');
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'luis@correo.com');
    await usuario.type(screen.getByLabelText('CURP'), 'ABC');
    await usuario.type(screen.getByLabelText('Contraseña'), 'Secreta123');
    await usuario.type(screen.getByLabelText('Confirmar contraseña'), 'Secreta123');
    await usuario.click(screen.getByRole('checkbox'));
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText(/CURP inválido/)).toBeInTheDocument();
    expect(base().usuarios.some((u) => u.correo === 'luis@correo.com')).toBe(false);
  });

  it('CP-02: un CURP duplicado se marca en su campo', async () => {
    const { usuario } = renderizarApp('/registro');
    await usuario.type(await screen.findByLabelText('Nombre completo'), 'Otra Persona');
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'otra@correo.com');
    await usuario.type(screen.getByLabelText('CURP'), 'PERA000229MDFRRSA1');
    await usuario.type(screen.getByLabelText('Contraseña'), 'Secreta123');
    await usuario.type(screen.getByLabelText('Confirmar contraseña'), 'Secreta123');
    await usuario.click(screen.getByRole('checkbox'));
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Ese CURP ya está registrado en el sistema.')).toBeInTheDocument();
  });

  it('CP-01 y CP-04: registro, código incorrecto y luego correcto activan la cuenta', async () => {
    const { usuario, enrutador } = renderizarApp('/registro');
    await usuario.type(await screen.findByLabelText('Nombre completo'), 'Luis Pérez');
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'luis@correo.com');
    await usuario.type(screen.getByLabelText('CURP'), 'PELL010101HVZRSS05');
    await usuario.type(screen.getByLabelText('Contraseña'), 'Secreta123');
    await usuario.type(screen.getByLabelText('Confirmar contraseña'), 'Secreta123');
    await usuario.click(screen.getByRole('checkbox'));
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    const campo = await screen.findByLabelText('Código de verificación');
    expect(enrutador.state.location.search).toContain('correo=luis%40correo.com');
    // La API acaba de emitir el código: reenviar espera 60 s y se explica dónde buscar el correo.
    expect(screen.getByRole('button', { name: /Reenviar código \(\d+ s\)/ })).toBeDisabled();
    expect(screen.getByText(/revisa la carpeta de no deseados/)).toBeInTheDocument();
    await usuario.type(campo, '000000');
    await usuario.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(await screen.findByText('El código es incorrecto. Intenta de nuevo o solicita otro.')).toBeInTheDocument();
    expect(base().usuarios.find((u) => u.correo === 'luis@correo.com')?.estado).toBe('PENDIENTE');

    await usuario.clear(campo);
    await usuario.type(campo, '123456');
    await usuario.click(screen.getByRole('button', { name: 'Verificar' }));
    await waitFor(() => expect(enrutador.state.location.pathname).toBe('/acceso'));
    expect(await screen.findByText('Tu cuenta está activa. Ya puedes iniciar sesión.')).toBeInTheDocument();
  });
});
