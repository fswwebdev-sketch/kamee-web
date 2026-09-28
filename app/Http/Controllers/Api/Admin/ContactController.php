<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Admin: Kontak
 *
 * @authenticated
 */
class ContactController extends Controller
{
    /** @queryParam filter[status] string new|read|replied Example: new */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Contact::class);

        $contacts = QueryBuilder::for(Contact::class)
            ->allowedFilters([AllowedFilter::exact('status')])
            ->defaultSort('-created_at')
            ->allowedSorts(['created_at'])
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return ContactResource::collection($contacts);
    }

    public function show(Contact $contact): ContactResource
    {
        $this->authorize('view', $contact);

        return new ContactResource($contact);
    }

    /** Tandai dibaca / dibalas. */
    public function update(UpdateContactRequest $request, Contact $contact): ContactResource
    {
        $this->authorize('update', $contact);

        $contact->update($request->validated());

        return (new ContactResource($contact))->additional(['message' => 'Status pesan kontak diperbarui.']);
    }
}
