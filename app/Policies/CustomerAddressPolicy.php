<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\CustomerAddress;

/** Alamat hanya dapat dikelola pemiliknya. */
class CustomerAddressPolicy
{
    public function view(Customer $customer, CustomerAddress $address): bool
    {
        return $address->customer_id === $customer->id;
    }

    public function update(Customer $customer, CustomerAddress $address): bool
    {
        return $address->customer_id === $customer->id;
    }

    public function delete(Customer $customer, CustomerAddress $address): bool
    {
        return $address->customer_id === $customer->id;
    }
}
