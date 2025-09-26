import React, { useState, useEffect } from 'react';import React, { useState, useEffect } from 'react';import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { User, Client } from '../types';

import { api } from '../services/api';import { User, Client } from '../types';// FIX: Corrected import paths to be relative.

import { Card } from './ui/Card';

import { Button } from './ui/Button';import { api } from '../services/api';import { User, Client, Address } from '../types';



interface ClientsViewProps {import { Card } from './ui/Card';import { api } from '../services/mockApi';

  user: User;

  addToast: (message: string, type: 'success' | 'error') => void;import { Button } from './ui/Button';import { Card } from './ui/Card';

}

import { Button } from './ui/Button';

const ClientsView: React.FC<ClientsViewProps> = ({ user, addToast }) => {

  const [clients, setClients] = useState<Client[]>([]);interface ClientsViewProps {import { ViewHeader } from './layout/ViewHeader';

  const [loading, setLoading] = useState(true);

  user: User;import { Tag } from './ui/Tag';

  useEffect(() => {

    const fetchClients = async () => {  addToast: (message: string, type: 'success' | 'error') => void;

      try {

        if (!user.companyId) return;}interface ClientsViewProps {

        const data = await api.getClientsByCompany(user.companyId);

        setClients(data);  user: User;

      } catch (error) {

        console.error('Error fetching clients:', error);const ClientsView: React.FC<ClientsViewProps> = ({ user, addToast }) => {  addToast: (message: string, type: 'success' | 'error') => void;

        addToast('Failed to load clients', 'error');

      } finally {  const [clients, setClients] = useState<Client[]>([]);}

        setLoading(false);

      }  const [loading, setLoading] = useState(true);

    };

interface ClientFormState {

    fetchClients();

  }, [user.companyId, addToast]);  useEffect(() => {  name: string;



  if (loading) {    const fetchClients = async () => {  contactPerson: string;

    return (

      <div className="flex items-center justify-center h-64">      try {  contactEmail: string;

        <div className="text-muted-foreground">Loading clients...</div>

      </div>        if (!user.companyId) return;  contactPhone: string;

    );

  }        const data = await api.getClientsByCompany(user.companyId);  companyEmail: string;



  return (        setClients(data);  companyPhone: string;

    <div className="space-y-6">

      <div className="flex items-center justify-between">      } catch (error) {  billingAddress: string;

        <h1 className="text-2xl font-semibold text-foreground">Clients</h1>

        <Button>Add Client</Button>        console.error('Error fetching clients:', error);  paymentTerms: string;

      </div>

        addToast('Failed to load clients', 'error');  isActive: boolean;

      {clients.length === 0 ? (

        <Card className="py-12 text-center">      } finally {  address: Address;

          <h3 className="text-lg font-medium text-foreground">No clients found</h3>

          <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first client.</p>        setLoading(false);}

        </Card>

      ) : (      }

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          {clients.map((client) => (    };const defaultClientFormState = (): ClientFormState => ({

            <Card key={client.id} className="p-6">

              <h3 className="text-lg font-medium text-foreground">{client.name}</h3>  name: '',

              <p className="text-sm text-muted-foreground">{client.email}</p>

              {client.phone && (    fetchClients();  contactPerson: '',

                <p className="text-sm text-muted-foreground">{client.phone}</p>

              )}  }, [user.companyId, addToast]);  contactEmail: '',

            </Card>

          ))}  contactPhone: '',

        </div>

      )}  if (loading) {  companyEmail: '',

    </div>

  );    return (  companyPhone: '',

};

      <div className="flex items-center justify-center h-64">  billingAddress: '',

export { ClientsView };

export default ClientsView;        <div className="text-muted-foreground">Loading clients...</div>  paymentTerms: 'Net 30',

      </div>  isActive: true,

    );  address: {

  }    street: '',

    city: '',

  return (    state: '',

    <div className="space-y-6">    zipCode: '',

      <div className="flex items-center justify-between">    country: '',

        <h1 className="text-2xl font-semibold text-foreground">Clients</h1>  },

        <Button>Add Client</Button>});

      </div>

const CreateClientModal: React.FC<{

      {clients.length === 0 ? (  user: User;

        <Card className="py-12 text-center">  onClose: () => void;

          <h3 className="text-lg font-medium text-foreground">No clients found</h3>  onClientCreated: (client: Client) => void;

          <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first client.</p>  addToast: (message: string, type: 'success' | 'error') => void;

        </Card>}> = ({ user, onClose, onClientCreated, addToast }) => {

      ) : (  const [formState, setFormState] = useState<ClientFormState>(defaultClientFormState);

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">  const [isSaving, setIsSaving] = useState(false);

          {clients.map((client) => (  const nameInputRef = useRef<HTMLInputElement>(null);

            <Card key={client.id} className="p-6">

              <h3 className="text-lg font-medium text-foreground">{client.name}</h3>  useEffect(() => {

              <p className="text-sm text-muted-foreground">{client.email}</p>    nameInputRef.current?.focus();

              {client.phone && (  }, []);

                <p className="text-sm text-muted-foreground">{client.phone}</p>

              )}  const handleAddressChange = (field: keyof Address, value: string) => {

            </Card>    setFormState(prev => ({

          ))}      ...prev,

        </div>      address: {

      )}        ...prev.address,

    </div>        [field]: value,

  );      },

};    }));

  };

export { ClientsView };

export default ClientsView;  const handleChange = (field: keyof ClientFormState, value: string | boolean) => {
    if (field === 'address') return;
    setFormState(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const timestamp = new Date().toISOString();
    const payload = {
      name: formState.name.trim(),
      contactPerson: formState.contactPerson.trim(),
      contactEmail: formState.contactEmail.trim(),
      contactPhone: formState.contactPhone.trim(),
      email: (formState.companyEmail || formState.contactEmail).trim(),
      phone: (formState.companyPhone || formState.contactPhone).trim(),
      billingAddress: formState.billingAddress.trim() || formState.address.street.trim(),
      paymentTerms: formState.paymentTerms.trim() || 'Net 30',
      isActive: formState.isActive,
      address: {
        street: formState.address.street.trim(),
        city: formState.address.city.trim(),
        state: formState.address.state.trim(),
        zipCode: formState.address.zipCode.trim(),
        country: formState.address.country.trim(),
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (!payload.name || !payload.contactEmail) {
      addToast('Client name and contact email are required.', 'error');
      setIsSaving(false);
      return;
    }

    try {
      const newClient = await api.createClient(payload, user.id);
      addToast('Client added successfully.', 'success');
      onClientCreated(newClient);
      onClose();
      setFormState(defaultClientFormState());
    } catch (error) {
      console.error('Failed to create client', error);
      addToast('Could not save the client. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-2xl overflow-hidden" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">Add new client</h3>
            <p className="text-sm text-muted-foreground">Capture the key contact and billing information for this account.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            aria-label="Close create client modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted-foreground">
              Client name
              <input
                ref={nameInputRef}
                type="text"
                value={formState.name}
                onChange={event => handleChange('name', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Acme Developments"
                required
              />
            </label>
            <label className="text-sm font-medium text-muted-foreground">
              Primary contact
              <input
                type="text"
                value={formState.contactPerson}
                onChange={event => handleChange('contactPerson', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Jane Smith"
              />
            </label>
            <label className="text-sm font-medium text-muted-foreground">
              Contact email
              <input
                type="email"
                value={formState.contactEmail}
                onChange={event => handleChange('contactEmail', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="jane@client.com"
                required
              />
            </label>
            <label className="text-sm font-medium text-muted-foreground">
              Contact phone
              <input
                type="tel"
                value={formState.contactPhone}
                onChange={event => handleChange('contactPhone', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="555-0102"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted-foreground">
              Accounts email
              <input
                type="email"
                value={formState.companyEmail}
                onChange={event => handleChange('companyEmail', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="accounts@client.com"
              />
            </label>
            <label className="text-sm font-medium text-muted-foreground">
              Accounts phone
              <input
                type="tel"
                value={formState.companyPhone}
                onChange={event => handleChange('companyPhone', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="555-0199"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted-foreground">
              Payment terms
              <input
                type="text"
                value={formState.paymentTerms}
                onChange={event => handleChange('paymentTerms', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Net 30"
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={event => handleChange('isActive', event.target.checked)}
                className="h-4 w-4 rounded border border-border text-primary focus:ring-primary"
              />
              Active account
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-muted-foreground">
              Street address
              <input
                type="text"
                value={formState.address.street}
                onChange={event => handleAddressChange('street', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="221B Baker Street"
              />
            </label>
            <label className="text-sm font-medium text-muted-foreground">
              City
              <input
                type="text"
                value={formState.address.city}
                onChange={event => handleAddressChange('city', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="London"
              />
            </label>
            <label className="text-sm font-medium text-muted-foreground">
              County / State
              <input
                type="text"
                value={formState.address.state}
                onChange={event => handleAddressChange('state', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Greater London"
              />
            </label>
            <label className="text-sm font-medium text-muted-foreground">
              Postcode
              <input
                type="text"
                value={formState.address.zipCode}
                onChange={event => handleAddressChange('zipCode', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="NW1 6XE"
              />
            </label>
            <label className="text-sm font-medium text-muted-foreground md:col-span-2">
              Country
              <input
                type="text"
                value={formState.address.country}
                onChange={event => handleAddressChange('country', event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="United Kingdom"
              />
            </label>
          </div>

          <label className="text-sm font-medium text-muted-foreground">
            Billing notes
            <textarea
              value={formState.billingAddress}
              onChange={event => handleChange('billingAddress', event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              rows={3}
              placeholder="Accounts payable team located at..."
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save client
            </Button>
          </div>
        </form>
      </Card>
const ClientsView: React.FC<ClientsViewProps> = ({ user, addToast }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        const controller = new AbortController();
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;

        setLoading(true);
        try {
            if (!user.companyId) return;
            const data = await api.getClientsByCompany(user.companyId, { signal: controller.signal });
            if (controller.signal.aborted) return;
            setClients(data);
        } catch (error) {
            if (controller.signal.aborted) return;
            addToast("Failed to load clients.", "error");
        } finally {
            if (controller.signal.aborted) return;
            setLoading(false);
        }
    }, [user.companyId, addToast]);

    useEffect(() => {
        fetchData();
        return () => {
            abortControllerRef.current?.abort();
        };
    }, [fetchData]);

    const summary = useMemo(() => {
        const total = clients.length;
        const active = clients.filter(client => client.isActive).length;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const newThisMonth = clients.filter(client => {
            const created = new Date(client.createdAt);
            return !Number.isNaN(created.getTime()) && Date.now() - created.getTime() <= thirtyDays;
        }).length;
        return { total, active, newThisMonth };
    }, [clients]);

    if (loading) {
        return <Card><p>Loading clients...</p></Card>;
    }

    const handleClientCreated = (client: Client) => {
        setClients(prev => [...prev, client]);
    };

    return (
        <div className="space-y-6">
            {isModalOpen && (
                <CreateClientModal
                    user={user}
                    onClose={() => setIsModalOpen(false)}
                    onClientCreated={handleClientCreated}
                    addToast={addToast}
                />
            )}
            <ViewHeader
                view="clients"
                actions={
                    <Button onClick={() => setIsModalOpen(true)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add client
                    </Button>
                }
                meta={[
                    {
                        label: 'Total accounts',
                        value: `${summary.total}`,
                        helper: 'Companies you collaborate with',
                    },
                    {
                        label: 'Active',
                        value: `${summary.active}`,
                        helper: `${summary.active} currently engaged`,
                        indicator: summary.active > 0 ? 'positive' : 'neutral',
                    },
                    {
                        label: 'New this month',
                        value: `${summary.newThisMonth}`,
                        helper: summary.newThisMonth > 0 ? 'Recent wins' : 'No new clients yet',
                        indicator: summary.newThisMonth > 0 ? 'positive' : 'neutral',
                    },
                ]}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {clients.map(client => (
                    <Card key={client.id} className="flex h-full flex-col gap-4 animate-card-enter">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="truncate text-xl font-semibold text-foreground">{client.name}</h3>
                                <p className="text-sm text-muted-foreground">Partner since {new Date(client.createdAt).toLocaleDateString()}</p>
                            </div>
                            <Tag label={client.isActive ? 'Active' : 'Dormant'} color={client.isActive ? 'green' : 'gray'} />
                        </div>
                        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                            <p className="flex items-center gap-2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {client.contactEmail}
                            </p>
                            <p className="flex items-center gap-2 text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {client.contactPhone}
                            </p>
                            <p className="text-muted-foreground">Payment terms: {client.paymentTerms}</p>
                        </div>
                    </Card>
                ))}
            </div>
            {clients.length === 0 && (
                <Card className="py-12 text-center">
                    <h3 className="text-lg font-medium text-foreground">No clients found.</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Get started by adding your first client.</p>
                </Card>
            )}
        </div>
    );
};

export { ClientsView };
export default ClientsView;